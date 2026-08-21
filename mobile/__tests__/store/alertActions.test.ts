import {store} from '../../src/store/store';
import {createTimedAlert, removeAlert} from '../../src/store/alertActions';

describe('alertActions', () => {
  beforeEach(() => {
    const alerts = store.getState().expense.alerts;
    alerts.forEach(a => removeAlert(a.id));
  });

  describe('createTimedAlert', () => {
    it('creates alert with unique id', () => {
      const id = createTimedAlert({type: 'success', message: 'Test'});
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('adds alert to store', () => {
      createTimedAlert({type: 'error', message: 'Error occurred'});
      const alerts = store.getState().expense.alerts;
      expect(alerts.length).toBeGreaterThanOrEqual(1);
      const found = alerts.find(a => a.message === 'Error occurred');
      expect(found).toBeDefined();
      expect(found?.type).toBe('error');
    });

    it('auto-removes alert after timeout', async () => {
      const id = createTimedAlert(
        {type: 'info', message: 'Temporary'},
        100,
      );
      expect(
        store.getState().expense.alerts.find(a => a.id === id),
      ).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(
        store.getState().expense.alerts.find(a => a.id === id),
      ).toBeUndefined();
    });
  });

  describe('removeAlert', () => {
    it('removes alert from store immediately', () => {
      const id = createTimedAlert(
        {type: 'warning', message: 'Warning'},
        60000,
      );
      expect(
        store.getState().expense.alerts.find(a => a.id === id),
      ).toBeDefined();

      removeAlert(id);

      expect(
        store.getState().expense.alerts.find(a => a.id === id),
      ).toBeUndefined();
    });
  });
});
