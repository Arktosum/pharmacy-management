import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { StockItem } from './stockSlice';

// Async thunk to read data

const ORIGIN = 'http://localhost:3000/api'

const context = ORIGIN+"/logs"
export const fetchLogs = createAsyncThunk('data/fetchLogs', async () => {
  try {
    const response = await axios.get(context+"/"); // Adjust the URL as per your backend API
    return response.data;
  } catch (error) {
    throw error;
  }
});

// Async thunk to update data
export const updateLogItem = createAsyncThunk('data/updateLogItem', async (item : StockItem) => {
  try {
    const response = await axios.put(context+"/", item); // Adjust the URL as per your backend API
    return response.data;
  } catch (error : any) {
    alert(error.response.data.error);
    throw error;
  }
});

// Async thunk to delete data
export const deleteLogItem = createAsyncThunk('data/deleteLogItem', async (item : StockItem) => {
  try {
    const response = await axios.delete(context+"/"+item.id); 
    return response.data;
  } catch (error : any) {
    alert(error.response.data.error);
    throw error;
  }
});

export const addLogItem = createAsyncThunk('data/addLogItem', async (medicineName:string) => {
    try {
      const response = await axios.post(context+"/",{name : medicineName});
      return response.data
    } catch (error : any) {
        alert(error.response.data.error);
        throw error;
    }
});


export type LogTypes = "TRANSACTION" | "ADD" | "UPDATE" | "DELETE"
export interface LogItem  {
  type : LogTypes
  id : string
  data : any
}

export interface TransactionLog extends LogItem  {
  data : {
    patientName : string,
    consultFee : number,
    medicines : [StockItem]
  }
}
// Define initial state, reducers, and slice
const initialState : {
    data : LogItem[],
} = {
  data: [],
};

const logSlice = createSlice({
  name: 'log',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLogs.fulfilled, (state, action) => {
        state.data = action.payload;
      })
      .addCase(addLogItem.fulfilled, (state, action) => {
        state.data = [action.payload,...state.data];
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
