import { configureStore } from "@reduxjs/toolkit";
import stockSlice from "./features/stockSlice";
import logSlice from "./features/logSlice";


export const store = configureStore({
    reducer : {
        stocks : stockSlice,
        logs : logSlice
    },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
