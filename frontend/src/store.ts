import { configureStore } from "@reduxjs/toolkit";
import stockSlice from "./redux/stockSlice";
import logSlice from "./redux/logSlice";


export const store = configureStore({
    reducer: {
        stocks: stockSlice,
        logs: logSlice
    },
    // Removing default checks for better performance in development mode!
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            immutableCheck: false,
            serializableCheck: false,
        }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
