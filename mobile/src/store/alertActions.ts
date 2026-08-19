import {v4 as uuidv4} from 'uuid';
import {Alert} from '../Types';
import {expenseSlice} from './expenseSlice';
import {store} from './store';

export const createTimedAlert = (
  alert: Omit<Alert, 'id'>,
  timeout = 3000,
): string => {
  const alertId = uuidv4();
  const alertWithId: Alert = {id: alertId, ...alert};

  store.dispatch(expenseSlice.actions.addAlert(alertWithId));

  setTimeout(() => {
    store.dispatch(expenseSlice.actions.removeAlert(alertId));
  }, timeout);

  return alertId;
};

export const removeAlert = (alertId: string) => {
  store.dispatch(expenseSlice.actions.removeAlert(alertId));
};
