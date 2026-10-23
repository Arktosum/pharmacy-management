import { configureStore } from "@reduxjs/toolkit";
import stockSlice from "./redux/stockSlice";
import logSlice from "./redux/logSlice";
import { api } from "./api/api";
import { tipsApi } from "./api/tipsApi";

export const store = configureStore({
    reducer: {
        stocks: stockSlice,
        logs: logSlice,
        [api.reducerPath]: api.reducer,
        [tipsApi.reducerPath]: tipsApi.reducer,
    },
    // Removing default checks for better performance in development mode!
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            immutableCheck: false,
            serializableCheck: false,
        }).concat(api.middleware, tipsApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
