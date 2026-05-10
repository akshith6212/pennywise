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

  // Processing the last 20-30 mails as per your logs
  mailIdList = mailIdList.slice(80);
  console.log('Pending mail id length:', mailIdList.length);

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

    // 2. SEARCH FOR HDFC
    if (textToExtractFrom.toUpperCase().includes('HDFC')) {
      console.log('-> HDFC detected. Sending to Gemini ...');
      
      const geminiResponse = callGemini(textToExtractFrom, GEMINI_API_KEY);
      
      if (geminiResponse) {
        // This will now definitely show up if the call succeeds
        console.log('-> SUCCESS! Gemini JSON:', JSON.stringify(geminiResponse));
      } else {
        console.log('-> Gemini returned null (Check error logs above)');
        console.log("Snipppet ", textToExtractFrom);
      }
    } else {
      console.log('-> Not an HDFC mail, skipping LLM.');
    }

    console.log("Sender ", getMailSenderReceiver(res).senderEmail);
    lastMailId = currentMailId;
  }

  if (lastMailId) {
    setOneDoc('config', 'lastGmailId', lastMailId, accessToken);
  }
}


/**
 * Corrected naming for Google's REST API (camelCase)
 */
function callGemini(text, apiKey) {
  // 1. Switch to v1beta for better support with preview models
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  const prompt = `Analyze this email and return a JSON object.
    Keys: "cost" (number), "costType" ("debit" or "credit"), "vendor" (name or UPI ID).
    If it is not an expense, return null.
    
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
 * Extracts vendor information from an email snippet using regex patterns
 *
 * @param {string} snippet - The email snippet to extract vendor from
 * @param {string[]} vendorRegexPatterns - Array of regex patterns to try
 * @returns {string|null} - The extracted vendor as a string, or null if not found
 */
const extractVendorFromSnippet = (snippet, vendorRegexPatterns) => {
  return applyRegexPatterns(snippet, vendorRegexPatterns, (match) => {
    return match && match.trim() !== '';
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
const getExpense = (date, type, mailId) => {
  return {
    cost: 0,
    costType: 'debit',
    vendor: null,
    tag: null,
    type,
    date,
    modifiedDate: Date.now(),
    user: '',
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
