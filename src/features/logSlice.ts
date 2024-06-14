import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';
import { ORIGIN, toastOptions } from '../Components/Utils';
import { toast } from 'react-toastify';
import { StockItem } from './stockSlice';

const context = ORIGIN + "/logs"
export const fetchLogs = createAsyncThunk('data/fetchLogs', async () => {
  try {
    const response = await axios.get(context + "/"); // Adjust the URL as per your backend API
    return response.data;
  } catch (e) {
    const error = e as AxiosError;
    toast.error(error.message, toastOptions);
    throw error;
  }
});

export const fetchDailyCount = createAsyncThunk('data/fetchDailyCount', async () => {
  try {
    const response = await axios.get(context + "/dailyCount"); // Adjust the URL as per your backend API
    return response.data;
  } catch (e) {
    const error = e as AxiosError;
    toast.error(error.message, toastOptions);
    throw error;
  }
});


// Async thunk to update data
export const updateLogItem = createAsyncThunk('data/updateLogItem', async (item: LogItem) => {
  try {
    const response = await axios.put(context + "/", item); // Adjust the URL as per your backend API
    return response.data;
  } catch (e) {
    const error = e as AxiosError;
    toast.error(error.message, toastOptions);
    throw error;
  }
});

export const deleteLogItem = createAsyncThunk('data/deleteLogItem', async (item: LogItem) => {
  try {
    const response = await axios.delete(context + "/" + item.id);
    return response.data;
  } catch (e) {
    const error = e as AxiosError;
    toast.error(error.message, toastOptions);
    throw error;
  }
});

export const addLogItem = createAsyncThunk('data/addLogItem', async (item: LogItem) => {
  try {
    const response = await axios.post(context + "/", item);
    return response.data
  } catch (e) {
    const error = e as AxiosError;
    toast.error(error.message, toastOptions);
    throw error;
  }
});

export type LogTypes = "TRANSACTION" | "ADD" | "UPDATE" | "DELETE"

export interface StockLog extends StockItem{
  id: string,
  name: string,
  price: number,
  multiplier: number
}
export interface TransactionLog extends LogItem {
  patientName: string,
  consultFee: number,
  MTtotal: number,
  itemCount: number,
  medicines: StockLog[]
}

export interface LogItem {
  type: LogTypes,
  id: string,
  data: TransactionLog
}


// Define initial state, reducers, and slice
const initialState: {
  data: LogItem[],
} = {
  data: [],
};


const logSlice = createSlice({
  name: 'log',
  initialState,
  reducers: {

  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLogs.fulfilled, (state, action) => {
        state.data = action.payload.sort((a: { id: number; }, b: { id: number; }) => b.id - a.id);
      })
      .addCase(addLogItem.fulfilled, (state, action) => {
        state.data = [action.payload, ...state.data];
      })
      .addCase(updateLogItem.fulfilled, (state, action) => {
        // Update the data in the state
        const updatedDataIndex = state.data.findIndex(item => item.id === action.payload.id);
        if (updatedDataIndex !== -1) {
          state.data[updatedDataIndex] = action.payload;
        }
      })
      .addCase(deleteLogItem.fulfilled, (state, action) => {
        state.data = state.data.filter(item => item.id !== action.payload.id);
      })
  },
});

export default logSlice.reducer;
