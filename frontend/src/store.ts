import { configureStore } from "@reduxjs/toolkit";
import stockSlice from "./redux/stockSlice";
import logSlice from "./redux/logSlice";


export const store = configureStore({
    reducer: {
        stocks: stockSlice,
        logs: logSlice
    },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
