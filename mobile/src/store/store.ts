import {combineReducers, configureStore} from '@reduxjs/toolkit';
import {expenseSlice} from './expenseSlice';

const rootReducer = combineReducers({
  expense: expenseSlice.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
