import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';
import { Zoom, toast } from 'react-toastify';

// Async thunk to read data

const ORIGIN = 'http://localhost:3000/api'

const context = ORIGIN + "/stocks"
export const fetchStock = createAsyncThunk('data/fetchStock', async () => {

  try {
    const response = await axios.get(context + "/"); // Adjust the URL as per your backend API
    return response.data;
  } catch (e) {
    const error = e as AxiosError;
    throw error;
  }
});

// Async thunk to update data
export const updateStockItem = createAsyncThunk('data/updateStockItem', async (item: StockItem) => {

  try {
    const response = await axios.put(context + "/", item); // Adjust the URL as per your backend API
    return response.data;
  } catch (e) {
    const error = e as AxiosError;
    throw error;
  }
});

export const updateStockItems = createAsyncThunk('data/updateStockItems', async (items: StockItem[]) => {
  try {
    const response = await axios.put(context + "/many", items); // Adjust the URL as per your backend API
    return response.data;
  } catch (e) {
    const error = e as AxiosError;
    throw error;
  }
});


// Async thunk to delete data
export const deleteStockItem = createAsyncThunk('data/deleteStockItem', async (item: StockItem) => {
  try {
    const response = await axios.delete(context + "/" + item.id);
    toast.success('Deleted Item! : ' + item.name, {
      position: "top-center",
      autoClose: 300,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
      progress: 0,
      theme: "dark",
      transition: Zoom,
    });
    return response.data;
  } catch (e) {
    const error = e as AxiosError;
    throw error;
  }
});

export const addStockItem = createAsyncThunk('data/addStockItem', async (medicineName: string) => {
  try {
    const response = await axios.post(context + "/", { name: medicineName });
    toast.success('Added new Item! : ' + medicineName, {
      position: "top-center",
      autoClose: 300,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
      progress: 0,
      theme: "dark",
      transition: Zoom,
    });
    return response.data
  } catch (e) {
    const error = e as AxiosError;
    toast.error(error?.response?.data?.error + " " + medicineName, {
      position: "top-center",
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
      progress: 0,
      theme: "dark",
      transition: Zoom,
    });
    throw error;
  }
});

export type StockItem = {
  name: string,
  hundredml: string,
  thirtyml: number,
  price: number,
  id: string,
  multiplier?: number,
  updateType?: string,
  limit: number,
}
// Define initial state, reducers, and slice
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
      .addCase(addStockItem.fulfilled, (state, action) => {
        state.data = [action.payload, ...state.data];
      })
      .addCase(updateStockItem.fulfilled, (state, action) => {
        // Update the data in the state
        const updatedDataIndex = state.data.findIndex(item => item.id === action.payload.id);
        if (updatedDataIndex !== -1) {
          state.data[updatedDataIndex] = action.payload;
        }
      })
      .addCase(updateStockItems.fulfilled, (state, action) => {
        state.data = action.payload;
      })
      .addCase(deleteStockItem.fulfilled, (state, action) => {
        state.data = state.data.filter(item => item.id !== action.payload.id);
      })
  },
});

export default stockSlice.reducer;
