import {expenseSlice} from '../../src/store/expenseSlice';
import {Expense, VendorTag, Budget} from '../../src/Types';

const reducer = expenseSlice.reducer;
const actions = expenseSlice.actions;

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'exp-1',
  mailId: 'mail-1',
  cost: 100,
  costType: 'debit',
  date: Date.now(),
  modifiedDate: Date.now(),
  user: 'testuser',
  type: 'UPI',
  vendor: 'Amazon',
  operation: 'create',
  tag: 'Shopping',
  ...overrides,
});

const makeBudget = (overrides: Partial<Budget> = {}): Budget => ({
  id: 'budget-1',
  name: 'Food Budget',
  amount: 5000,
  tagList: ['Food'],
  modifiedDate: Date.now(),
  ...overrides,
});

const initialState = reducer(undefined, {type: '@@INIT'});

describe('expenseSlice reducers', () => {
  describe('setExpenseList', () => {
    it('sets the expense list', () => {
      const expenses = [makeExpense()];
      const state = reducer(initialState, actions.setExpenseList(expenses));
      expect(state.expenseList).toEqual(expenses);
    });

    it('replaces existing list', () => {
      const state1 = reducer(
        initialState,
        actions.setExpenseList([makeExpense()]),
      );
      const newExpenses = [makeExpense({id: 'exp-2', mailId: 'mail-2'})];
      const state2 = reducer(state1, actions.setExpenseList(newExpenses));
      expect(state2.expenseList).toHaveLength(1);
      expect(state2.expenseList[0].id).toBe('exp-2');
    });
  });

  describe('setTagExpense', () => {
    it('sets the expense and opens tag modal', () => {
      const expense = makeExpense();
      const state = reducer(initialState, actions.setTagExpense(expense));
      expect(state.expense).toEqual(expense);
      expect(state.isTagModal).toBe(true);
    });
  });

  describe('hideTagExpense', () => {
    it('closes the tag modal', () => {
      const stateWithModal = reducer(
        initialState,
        actions.setTagExpense(makeExpense()),
      );
      const state = reducer(stateWithModal, actions.hideTagExpense());
      expect(state.isTagModal).toBe(false);
    });
  });

  describe('setTagMap', () => {
    it('adds new vendor tag', () => {
      const vt: VendorTag = {
        id: 'vt-1',
        vendor: 'Amazon',
        tag: 'Shopping',
        date: Date.now(),
      };
      const state = reducer(initialState, actions.setTagMap(vt));
      expect(state.vendorTagList).toHaveLength(1);
      expect(state.vendorTagList[0].tag).toBe('Shopping');
    });

    it('updates existing vendor tag', () => {
      const vt1: VendorTag = {
        id: 'vt-1',
        vendor: 'Amazon',
        tag: 'Shopping',
        date: Date.now(),
      };
      const state1 = reducer(initialState, actions.setTagMap(vt1));
      const vt2: VendorTag = {...vt1, tag: 'Online'};
      const state2 = reducer(state1, actions.setTagMap(vt2));
      expect(state2.vendorTagList).toHaveLength(1);
      expect(state2.vendorTagList[0].tag).toBe('Online');
    });
  });

  describe('updateExpense', () => {
    it('updates tag of existing expense', () => {
      const expense = makeExpense();
      const state1 = reducer(
        initialState,
        actions.setExpenseList([expense]),
      );
      const updated = {...expense, tag: 'Food'};
      const state2 = reducer(state1, actions.updateExpense(updated));
      expect(state2.expenseList[0].tag).toBe('Food');
    });

    it('adds expense if not found by mailId', () => {
      const expense = makeExpense({mailId: 'new-mail'});
      const state = reducer(initialState, actions.updateExpense(expense));
      expect(state.expenseList).toHaveLength(1);
    });
  });

  describe('deleteExpense', () => {
    it('removes expense by mailId', () => {
      const expense = makeExpense();
      const state1 = reducer(
        initialState,
        actions.setExpenseList([expense]),
      );
      const state2 = reducer(state1, actions.deleteExpense(expense));
      expect(state2.expenseList).toHaveLength(0);
    });

    it('does not affect other expenses', () => {
      const e1 = makeExpense({mailId: 'mail-1'});
      const e2 = makeExpense({id: 'exp-2', mailId: 'mail-2'});
      const state1 = reducer(
        initialState,
        actions.setExpenseList([e1, e2]),
      );
      const state2 = reducer(state1, actions.deleteExpense(e1));
      expect(state2.expenseList).toHaveLength(1);
      expect(state2.expenseList[0].mailId).toBe('mail-2');
    });
  });

  describe('setExpenseState', () => {
    it('sets expense list, vendor tags, dark mode, and clears loading', () => {
      const expenses = [makeExpense()];
      const vendorTags: VendorTag[] = [
        {id: 'vt-1', vendor: 'Amazon', tag: 'Shop', date: Date.now()},
      ];
      const state = reducer(
        initialState,
        actions.setExpenseState({
          expenseList: expenses,
          vendorTagList: vendorTags,
          darkMode: true,
        }),
      );
      expect(state.expenseList).toEqual(expenses);
      expect(state.vendorTagList).toEqual(vendorTags);
      expect(state.appConfig.darkMode).toBe(true);
      expect(state.isAppLoading).toBe(false);
    });
  });

  describe('setTagList / addTag / deleteTag', () => {
    it('sets tag list', () => {
      const tags = ['Food', 'Travel'];
      const state = reducer(initialState, actions.setTagList(tags));
      expect(state.tagList).toEqual(tags);
    });

    it('adds a new tag', () => {
      const state1 = reducer(
        initialState,
        actions.setTagList(['Food']),
      );
      const state2 = reducer(state1, actions.addTag('Travel'));
      expect(state2.tagList).toEqual(['Food', 'Travel']);
    });

    it('does not add duplicate tag', () => {
      const state1 = reducer(
        initialState,
        actions.setTagList(['Food']),
      );
      const state2 = reducer(state1, actions.addTag('Food'));
      expect(state2.tagList).toEqual(['Food']);
    });

    it('deletes a tag', () => {
      const state1 = reducer(
        initialState,
        actions.setTagList(['Food', 'Travel']),
      );
      const state2 = reducer(state1, actions.deleteTag('Food'));
      expect(state2.tagList).toEqual(['Travel']);
    });
  });

  describe('mergeSaveExpense', () => {
    it('removes originals and adds merged expense', () => {
      const e1 = makeExpense({id: 'e1', mailId: 'm1', cost: 100});
      const e2 = makeExpense({id: 'e2', mailId: 'm2', cost: 200});
      const e3 = makeExpense({id: 'e3', mailId: 'm3', cost: 50});
      const merged = makeExpense({id: 'merged', mailId: 'mm', cost: 300});

      const state1 = reducer(
        initialState,
        actions.setExpenseList([e1, e2, e3]),
      );
      const state2 = reducer(
        state1,
        actions.mergeSaveExpense({
          originalExpenses: [e1, e2],
          mergedExpense: merged,
        }),
      );
      expect(state2.expenseList).toHaveLength(2);
      expect(state2.expenseList.find(e => e.id === 'merged')).toBeDefined();
      expect(state2.expenseList.find(e => e.id === 'e3')).toBeDefined();
    });
  });

  describe('toggleDarkMode', () => {
    it('toggles dark mode', () => {
      expect(initialState.appConfig.darkMode).toBe(false);
      const state1 = reducer(initialState, actions.toggleDarkMode());
      expect(state1.appConfig.darkMode).toBe(true);
      const state2 = reducer(state1, actions.toggleDarkMode());
      expect(state2.appConfig.darkMode).toBe(false);
    });
  });

  describe('alerts', () => {
    it('adds alert with provided id', () => {
      const alert = {id: 'a1', type: 'success' as const, message: 'Done!'};
      const state = reducer(initialState, actions.addAlert(alert));
      expect(state.alerts).toHaveLength(1);
      expect(state.alerts[0].id).toBe('a1');
    });

    it('adds alert without id (generates one)', () => {
      const alert = {type: 'error' as const, message: 'Failed!'};
      const state = reducer(initialState, actions.addAlert(alert));
      expect(state.alerts).toHaveLength(1);
      expect(state.alerts[0].id).toBeDefined();
      expect(state.alerts[0].id.length).toBeGreaterThan(0);
    });

    it('removes alert by id', () => {
      const alert = {id: 'a1', type: 'info' as const, message: 'Info'};
      const state1 = reducer(initialState, actions.addAlert(alert));
      const state2 = reducer(state1, actions.removeAlert('a1'));
      expect(state2.alerts).toHaveLength(0);
    });

    it('clears all alerts', () => {
      let state = initialState;
      state = reducer(
        state,
        actions.addAlert({id: 'a1', type: 'info', message: 'One'}),
      );
      state = reducer(
        state,
        actions.addAlert({id: 'a2', type: 'info', message: 'Two'}),
      );
      state = reducer(state, actions.clearAllAlerts());
      expect(state.alerts).toHaveLength(0);
    });
  });

  describe('budget reducers', () => {
    it('sets budget list', () => {
      const budgets = [makeBudget()];
      const state = reducer(initialState, actions.setBudgetList(budgets));
      expect(state.budgetList).toEqual(budgets);
    });

    it('adds a budget', () => {
      const budget = makeBudget();
      const state = reducer(initialState, actions.addBudget(budget));
      expect(state.budgetList).toHaveLength(1);
    });

    it('updates existing budget', () => {
      const budget = makeBudget();
      const state1 = reducer(initialState, actions.addBudget(budget));
      const updated = {...budget, amount: 10000};
      const state2 = reducer(state1, actions.updateBudget(updated));
      expect(state2.budgetList).toHaveLength(1);
      expect(state2.budgetList[0].amount).toBe(10000);
    });

    it('adds budget if update target not found', () => {
      const budget = makeBudget({id: 'new-budget'});
      const state = reducer(initialState, actions.updateBudget(budget));
      expect(state.budgetList).toHaveLength(1);
    });

    it('deletes budget by id', () => {
      const b1 = makeBudget({id: 'b1'});
      const b2 = makeBudget({id: 'b2'});
      const state1 = reducer(
        initialState,
        actions.setBudgetList([b1, b2]),
      );
      const state2 = reducer(state1, actions.deleteBudget('b1'));
      expect(state2.budgetList).toHaveLength(1);
      expect(state2.budgetList[0].id).toBe('b2');
    });
  });
});
