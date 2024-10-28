import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';
import { toast } from 'react-toastify';
import { ORIGIN, toastErroroptions, toastSuccessoptions } from '../components/Utils';
import { StockLog } from './logSlice';

// Async thunk to read data

const context = ORIGIN + "/stocks"
export const fetchStock = createAsyncThunk('data/fetchStock', async () => {
  console.log("fetching stock!");
  try {
    const response = await axios.get(context + "/"); // Adjust the URL as per your backend API
    return response.data;
  } catch (e) {
    const error = e as AxiosError;
    toast.error(error.message, toastErroroptions);
    throw error;
  }
});

export const createStockItem = createAsyncThunk('data/createStockItem', async (medicineName: string) => {
  try {
    const response = await axios.post(context + "/", { name: medicineName });
    toast.success('Added new Item! : ' + medicineName, toastSuccessoptions);
    return response.data
  } catch (e) {
    const error = e as AxiosError;
    toast.error(error.message + " " + medicineName, toastErroroptions);
    throw error;
  }
});

// Async thunk to update data
export const updateStockItem = createAsyncThunk('data/updateStockItem', async (item: StockItem) => {
  try {
    const response = await axios.put(context + "/", item);
    return response.data;
  } catch (e) {
    const error = e as AxiosError;
    toast.error(error.message, toastErroroptions);
    throw error;
  }
});

export const updateStockCount = createAsyncThunk('data/updateStockCount', async ({ items, type }: { items: StockLog[], type: "UNDO" | "REMOVE" }) => {
  // Will update the count of the stock item by "Multiplier". Always subtracts!
  try {
    const response = await axios.put(context + `/count/many/${type}`, items);
    return response.data;
  } catch (e) {
    const error = e as AxiosError;
    toast.error(error.message, toastErroroptions);
    throw error;
  }
});


// Async thunk to delete data
export const deleteStockItem = createAsyncThunk('data/deleteStockItem', async (item: StockItem) => {
  try {
    const response = await axios.delete(context + "/" + item.id);
    toast.success('Deleted Item! : ' + item.name, toastSuccessoptions);
    return response.data;
  } catch (e) {
    const error = e as AxiosError;
    toast.error(error.message, toastErroroptions);
    throw error;
  }
});


export type StockItem = {
  id: string,
  name: string,
  remarks: string,
  updatedAt: string,
  count: number,
  price: number,
  limit: number,
}

const initialState: {
  data: StockItem[],
} = {
  data: [],
};

const stockSlice = createSlice({
  name: 'stock',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStock.fulfilled, (state, action) => {
        state.data = action.payload;
      })
      .addCase(createStockItem.fulfilled, (state, action) => {
        state.data = [action.payload, ...state.data];
      })
      .addCase(updateStockItem.fulfilled, (state, action) => {
        const updatedDataIndex = state.data.findIndex(item => item.id === action.payload.id);
        if (updatedDataIndex !== -1) {
          state.data[updatedDataIndex] = action.payload;
        }
      })
      .addCase(updateStockCount.fulfilled, (state, action) => {
        state.data = action.payload;
      })
      .addCase(deleteStockItem.fulfilled, (state, action) => {
        state.data = state.data.filter(item => item.id !== action.payload.id);
      })
  },
});

export default stockSlice.reducer;
