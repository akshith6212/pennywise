/*
MIT License
Copyright (c) 2025 rushikc <rushikc.dev@gmail.com>
*/

/* eslint-disable */
// noinspection JSUnusedGlobalSymbols
// noinspection JSUnresolvedReference

/*
MIT License
Copyright (c) 2025 rushikc <rushikc.dev@gmail.com>
*/

/* eslint-disable */

async function myExpenseFunction() {
  const Config = 'config';
  const LastGmailId = 'lastGmailId';
  const VendorTag = 'vendorTag';

  // 1. CHECK API KEY
  if (!GEMINI_API_KEY) {
    console.error('CRITICAL ERROR: GEMINI_API_KEY is not set in Script Properties!');
    return;
  }

  let res = Gmail.Users.Messages.list('me');
  let mailIdList = res.messages.map((res) => res.id);
  const accessToken = ScriptApp.getOAuthToken();

  let lastMailId;
  mailIdList = mailIdList.reverse();

  let res_doc = getOneDoc(Config, LastGmailId, accessToken);
  let mailId = res_doc ? res_doc.value : '';

  const bankParseDoc = getOneDoc(Config, 'emailParseBanks', accessToken);
  const emailParseBanks = (bankParseDoc && bankParseDoc.banks) ? bankParseDoc.banks : [];

  const vendorTagRaw = getAllDoc(VendorTag, accessToken);
  const vendorTagList = Array.isArray(vendorTagRaw) ? vendorTagRaw : [];

  let lastMailIdIndex = mailIdList.indexOf(mailId);
  mailIdList = mailIdList.slice(90); // For testing: process last 30 mails
  // mailIdList = mailIdList.slice(lastMailIdIndex + 1);
  console.log('Pending mail id list ', mailIdList);
  console.log('Pending mail id length', mailIdList.length);


  for (const mailIndex in mailIdList) {
    let currentMailId = mailIdList[mailIndex];
    res = Gmail.Users.Messages.get('me', currentMailId);

    let textToExtractFrom = res.snippet; 
    let rawContent = '';

    if (res.payload.parts && res.payload.parts.length > 0) {
      rawContent = findBody(res.payload.parts);
    } else if (res.payload.body && res.payload.body.data) {
      rawContent = base64Decode(res.payload.body.data);
    }

    if (rawContent) {
      textToExtractFrom = extractPlainTextFromHtml(rawContent);
    }

    const matchedBankDisplayName = findEmailParseBankMatch(textToExtractFrom, emailParseBanks);
    console.log("Sender ", getMailSenderReceiver(res).senderEmail);
    
    if (matchedBankDisplayName) {

      console.log('-> ' + matchedBankDisplayName + ' detected valid bank. Sending to Gemini ...');

      const emailSubject = getMailSubject(res);
      const geminiResponse = callGemini(textToExtractFrom, emailSubject, GEMINI_API_KEY);
      const validatedExpense = validateExpense(geminiResponse, textToExtractFrom, emailSubject, GEMINI_API_KEY);

      if (validatedExpense) {
        console.log('-> Validated expense:', JSON.stringify(validatedExpense));
        addExpense(res, currentMailId, validatedExpense, accessToken, vendorTagList);
      } else {
        console.log('-> No valid expense after Gemini + validation (or not an expense).');
        console.log('Snippet ', textToExtractFrom);
      }
    } else {
      console.log('-> No configured bank match, skipping LLM.');
    }

    lastMailId = currentMailId;
  }

  if (lastMailId) {
    setOneDoc('config', 'lastGmailId', lastMailId, accessToken);
  }
}

/**
 * Returns displayName for the first bank whose matchStrings appear in text (case-insensitive).
 * @param {string} text
 * @param {Array<{displayName?: string, matchStrings?: string[]}>} banks
 * @returns {string|null}
 */
/**
 * Validates Gemini JSON for a single expense. Logs each candidate object.
 * Retries callGemini once if the first body fails sanity checks.
 *
 * @param {*} geminiBody - First Gemini parse result (may be null if not an expense).
 * @param {string} emailText - Original email text for a single retry.
 * @param {string} emailSubject - Email subject line (passed to Gemini on retry).
 * @param {string} apiKey - Gemini API key.
 * @returns {{cost: number, costType: string, vendor: string}|null}
 */
function validateExpense(geminiBody, emailText, emailSubject, apiKey) {
  if (geminiBody === null) {
    return null;
  }

  if (isValidExpenseGeminiShape(geminiBody)) {
    return normalizeGeminiExpense(geminiBody);
  }

  console.warn('-> validateExpense: invalid shape; retrying callGemini once');
  const second = callGemini(emailText, emailSubject, apiKey);

  if (second === null) {
    return null;
  }

  if (isValidExpenseGeminiShape(second)) {
    return normalizeGeminiExpense(second);
  }

  console.error('-> validateExpense: still invalid after retry ', JSON.stringify(second));
  return null;
}

/**
 * @param {*} o
 * @returns {boolean}
 */
function isValidExpenseGeminiShape(o) {
  if (o === null || o === undefined) {
    return false;
  }
  if (typeof o !== 'object' || Array.isArray(o)) {
    return false;
  }
  if (!Object.prototype.hasOwnProperty.call(o, 'cost') ||
      !Object.prototype.hasOwnProperty.call(o, 'costType') ||
      !Object.prototype.hasOwnProperty.call(o, 'vendor')) {
    console.warn('validateExpense: missing cost, costType, or vendor');
    return false;
  }

  const costNum = Number(o.cost);
  if (isNaN(costNum) || costNum <= 0) {
    console.warn('validateExpense: cost must be a positive number');
    return false;
  }

  const ct = String(o.costType).toLowerCase().trim();
  if (ct !== 'debit' && ct !== 'credit') {
    console.warn('validateExpense: costType must be debit or credit');
    return false;
  }

  const vendorStr = o.vendor === null || o.vendor === undefined ? '' : String(o.vendor).trim();
  if (!vendorStr) {
    console.warn('validateExpense: vendor must be a non-empty string');
    return false;
  }

  return true;
}

/**
 * @param {object} o
 * @returns {{cost: number, costType: string, vendor: string, type: string}}
 */
function normalizeGeminiExpense(o) {
  return {
    cost: Number(Number(o.cost).toFixed(2)),
    costType: String(o.costType).toLowerCase().trim(),
    vendor: String(o.vendor).trim(),
    type: String(o.type).toLowerCase().trim(),
  };
}

/**
 * Merges getExpense() with validated Gemini fields and persists via cloudAddExpense.
 *
 * @param {object} gmailMessage - Gmail Users.Messages resource (for date + user).
 * @param {string} mailId - Gmail message id (mailId in app).
 * @param {{cost: number, costType: string, vendor: string, type?: string}} validatedGemini
 * @param {string} accessToken - OAuth token for cloud function.
 * @param {Array<{vendor?: string, tag?: string}>} vendorTagList - Firestore vendorTag docs for tagging.
 */
function addExpense(gmailMessage, mailId, validatedGemini, accessToken, vendorTagList) {
  const cost = validatedGemini.cost;
  let vendor = validatedGemini.vendor == null ? null : String(validatedGemini.vendor).trim();

  if (cost == null || vendor === null || vendor === '') {
    console.log('-> Failed to extract valid cost or vendor from snippet');
    return;
  }

  let mailDate = Date.now();
  if (gmailMessage && gmailMessage.internalDate !== undefined && gmailMessage.internalDate !== null) {
    mailDate = Number(gmailMessage.internalDate);
    if (isNaN(mailDate)) {
      mailDate = Date.now();
    }
  }

  const expense = getExpense(mailDate, mailId);
  expense.costType = validatedGemini.costType;
  expense.cost = Number(cost);

  const upiPattern = /^([^\s@]+@[^\s@]+)\s+(.+)$/;
  const upiMatch = vendor.match(upiPattern);

  if (upiMatch && upiMatch[1].trim().length !== 0 && upiMatch[2].trim().length !== 0) {
    const upiId = upiMatch[1].trim();
    const name = upiMatch[2].trim();
    vendor = `${name} ${upiId}`;
  }

  expense.vendor = vendor.toUpperCase().substring(0, 100);
  expense.user = extractUsername(getMailSenderReceiver(gmailMessage).receiverEmail);

  const tagList = Array.isArray(vendorTagList) ? vendorTagList : [];
  const tagObj = tagList.find(function (entry) {
    if (!entry || entry.vendor == null) {
      return false;
    }
    return expense.vendor === String(entry.vendor).trim().toUpperCase().substring(0, 100);
  });
  if (tagObj) {
    expense.tag = tagObj.tag;
  }

  expense.type = validatedGemini.type;
  expense.operation = 'add';

  console.log('-> addExpense payload:', JSON.stringify(expense));
  const result = cloudAddExpense(expense, accessToken);
  console.log('-> addExpense cloud response:', JSON.stringify(result));

  const typeLabel = (validatedGemini.type && String(validatedGemini.type)) || 'expense';
  console.log('-> ', typeLabel.toUpperCase(), ' cost: ', expense.cost);
  console.log('-> ', typeLabel.toUpperCase(), ' vendor: ', expense.vendor);
  console.log('-> ', typeLabel.toUpperCase(), ' expense: ', expense);
}

function findEmailParseBankMatch(text, banks) {
  if (!text || !banks || !banks.length) {
    return null;
  }
  const haystack = text.toUpperCase();
  for (let i = 0; i < banks.length; i++) {
    const entry = banks[i];
    const phrases = entry.matchStrings || [];
    const display = entry.displayName || '';
    for (let j = 0; j < phrases.length; j++) {
      const p = String(phrases[j]).trim().toUpperCase();
      if (p && haystack.indexOf(p) !== -1) {
        return display || 'Bank';
      }
    }
  }
  return null;
}


/**
 * Corrected naming for Google's REST API (camelCase)
 */
function callGemini(text, subject, apiKey) {
  // 1. Switch to v1beta for better support with preview models
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  const prompt = `Analyze this email and return a JSON object.
    Keys: "cost" (number), "costType" ("debit" or "credit"), "vendor" (name or UPI ID), "type" (upi, credit-card, e-mandate etc.).
    Note: usually if it's upi, you will see upi id like abc@ybl, xyz@paytm, etc
    Note: if it's credit card, you see text like "Credit Card ending 1234"
    
    IMPORTANT: If it is not an expense mail, return null.
    
    Email Subject: ${subject}
    Email: ${text}`;

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    // 2. Use snake_case keys for the REST API
    generation_config: {
      response_mime_type: "application/json"
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true 
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (statusCode !== 200) {
      console.error(`Gemini API Error (Status ${statusCode}): ${responseText}`);
      return null;
    }

    const json = JSON.parse(responseText);
    
    // Check if the response contains the expected text
    if (json.candidates && json.candidates[0].content && json.candidates[0].content.parts[0].text) {
      const resultText = json.candidates[0].content.parts[0].text;
      return JSON.parse(resultText);
    }
  } catch (e) {
    console.error('Error parsing Gemini response:', e.toString());
  }
  return null;
}

// --- KEEP YOUR EXISTING findBody, base64Decode, extractPlainTextFromHtml, etc. ---

/**
 * Applies regex patterns to a string and returns the first valid match
 *
 * @param {string} snippet - The text to apply regex patterns to
 * @param {string[]} regexPatterns - Array of regex patterns to try
 * @param {function} validationFn - Function to validate the match
 * @returns {string|null} - The first valid match or null if no match found
 */
const applyRegexPatterns = (snippet, regexPatterns, validationFn) => {
  for (const pattern of regexPatterns) {
    try {
      const match = snippet.match(new RegExp(pattern));
      if (match && match[1]) {
        const result = match[1];
        if (validationFn(result)) {
          return result;
        }
      }
    } catch (regexError) {
      console.log(`-> Regex failed: ${pattern}`, regexError.message);
    }
  }
  return null;
};

/**
 * Extracts cost information from an email snippet using regex patterns
 *
 * @param {string} snippet - The email snippet to extract cost from
 * @param {string[]} costRegexPatterns - Array of regex patterns to try
 * @returns {string|null} - The extracted cost as a string, or null if not found
 */
const extractCostFromSnippet = (snippet, costRegexPatterns) => {
  return applyRegexPatterns(snippet, costRegexPatterns, (match) => {
    const parsedCost = Number(match);
    return !isNaN(parsedCost) && parsedCost > 0;
  });
};



/**
 * Extracts the clean email address from a string that may contain a display name
 * (e.g., "HDFC Bank InstaAlerts <alerts@hdfcbank.net>").
 * @param {string} emailString The full email string from the header.
 * @returns {string} The clean email address.
 */
function extractEmailAddress(emailString) {
  if (!emailString) return '';
  const match = emailString.match(/<([^>]+)>/);
  if (match) {
    return match[1].trim();
  }
  return emailString.trim().toLowerCase();
}


/**
 * @param {*} res - Gmail Users.Messages resource
 * @returns {string}
 */
function getMailSubject(res) {
  if (!res || !res.payload || !res.payload.headers) {
    return '';
  }
  const headers = res.payload.headers;
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (h && String(h.name).toLowerCase() === 'subject') {
      return h.value != null ? String(h.value) : '';
    }
  }
  return '';
}

/**
 * Retrieves the sender and receiver email addresses from a Gmail Message object.
 * @returns {object} An object containing the sender and receiver emails.
 * @param res
 */
function getMailSenderReceiver(res) {

  let sender = '';
  let receiver = '';

  if (res && res.payload && res.payload.headers) {
    let headers = res.payload.headers;

    for (let i = 0; i < headers.length; i++) {
      let header = headers[i];

      if (header.name === 'From') {
        sender = header.value;
      }

      if (header.name === 'To') {
        receiver = header.value;
      }

      if (sender && receiver) {
        break;
      }
    }
  }

  const senderEmail = extractEmailAddress(sender);
  const receiverEmail = extractEmailAddress(receiver);

  return {
    sender,
    receiver,
    senderEmail,
    receiverEmail
  };
}

/**
 * Extracts the username (the part before the '@') from a full email address.
 * * For example: "RUSHI743@gmail.com" -> "RUSHI743"
 *
 * @param {string} emailAddress The full email address string.
 * @returns {string} The extracted username, or an empty string if the input is invalid.
 */
function extractUsername(emailAddress) {
  if (!emailAddress || typeof emailAddress !== 'string') {
    Logger.log('Error: Invalid input provided to extractUsername.');
    return '';
  }
  const atIndex = emailAddress.indexOf('@');
  if (atIndex !== -1) {
    return emailAddress.substring(0, atIndex).trim().toLowerCase();
  }
  return emailAddress.trim().toLowerCase();
}

/**
 * Creates an expense object with default values.
 */
const getExpense = (date, mailId) => {
  return {
    cost: 0,
    costType: null,
    vendor: null,
    tag: null,
    type: null,
    date,
    modifiedDate: Date.now(),
    mailId,

  };
};


/**
 * Handles GET requests to the web app.
 * This function is triggered when the web app accesses AppScript.
 */
// function doGet() {
//   Logger.log('doGet function called.');
//   myExpenseFunction().then(() => Logger.log('executed expense function'));
//
//   // Return a ContentService response with the email and a 200 OK status
//   return ContentService.createTextOutput('Started function')
//     .setMimeType(ContentService.MimeType.TEXT);
// }
