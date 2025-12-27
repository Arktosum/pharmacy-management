import { useState } from "react";
import { useAppSelector, useAppDispatch } from "../hooks";
import {
  StockItem,
  createStockItem,
  deleteStockItem,
  updateStockItem,
} from "../redux/stockSlice";
import "react-toastify/dist/ReactToastify.css";
import { setState } from "../components/Utils";
import moment from "moment";

function sortStockItems(
  stockData: StockItem[],
  filter: Record<string, string>
) {
  return [...stockData].sort((a, b) => {
    const a_remarks = a.remarks;
    const b_remarks = b.remarks;
    switch (filter.type) {
      case "count":
        return filter.order == "asc" ? a.count - b.count : b.count - a.count;
      case "remarks":
        return filter.order == "asc"
          ? a_remarks.localeCompare(b_remarks)
          : b_remarks.localeCompare(a_remarks);
      case "price":
        return filter.order == "asc" ? a.price - b.price : b.price - a.price;
      case "name":
        return filter.order == "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      case "updatedAt":
        return filter.order == "asc"
          ? a.updatedAt.localeCompare(b.updatedAt)
          : b.updatedAt.localeCompare(a.updatedAt);
      default:
        return -1;
    }
  });
}

export default function Stock() {
  const [showModal, setshowModal] = useState(false);
  const [selectedItem, setselectedItem] = useState<StockItem | null>(null);
  const [filter, setFilter] = useState({ type: "count", order: "asc" });
  const [regexString, setregexString] = useState(".*");

  return (
    <div className="bg-black h-[90vh] flex">
      {showModal && selectedItem && (
        <StockModal
          setshowModal={setshowModal}
          selectedItem={selectedItem}
          setselectedItem={setselectedItem}
        />
      )}
      <div className="border-black w-full h-full">
        <h1 className="text-[2.5em] text-yellow-300 font-bold text-center uppercase">
          Stock
        </h1>
        <div className="flex items-center py-5 gap-5 justify-evenly">
          <CreateSection />
          <SearchSection
            setFilter={setFilter}
            regexString={regexString}
            setregexString={setregexString}
          />
        </div>
        <StockTable
          filter={filter}
          regexString={regexString}
          setselectedItem={setselectedItem}
          setshowModal={setshowModal}
        />
      </div>
    </div>
  );
}

interface StockModalProps {
  setshowModal: setState<boolean>;
  selectedItem: StockItem;
  setselectedItem: setState<StockItem | null>;
}
function StockModal({
  setshowModal,
  selectedItem,
  setselectedItem,
}: StockModalProps) {
  const dispatch = useAppDispatch();
  function resetModal() {
    setshowModal(false);
    setselectedItem(null);
  }
  function deleteStock() {
    if (!selectedItem) return;
    dispatch(deleteStockItem(selectedItem));
    resetModal();
  }
  function updateStock(e: React.FormEvent<HTMLFormElement>) {
    if (!selectedItem) return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<
      string,
      string
    >;
    const payload: StockItem = {
      name: data.name.toUpperCase(),
      count: parseInt(data.count),
      updatedAt: data.updatedAt,
      remarks: data.remarks,
      price: parseInt(data.price),
      id: selectedItem.id,
      limit: parseInt(data.limit),
      hundredml : data.hundredml
    };
    dispatch(updateStockItem(payload));
    e.currentTarget.reset();
    resetModal();
  }
  return (
    <div className="w-full h-full bg-[#000000a0] absolute flex justify-center items-center z-10">
      <div className="bg-gray-800 w-[50%] p-5 rounded-xl border-gray-600 border-2">
        <form
          className=""
          onSubmit={(e) => {
            updateStock(e);
          }}
        >
          <div className="grid grid-cols-2 gap-5 text-center my-5">
            <div className="grid grid-cols-2 gap-5 text-center ">
              <div className="text-yellow-300 text-xl uppercase">Name </div>
              <input
                type="text"
                name="name"
                className="px-5 py-2 text-yellow-300 text-[1.2em] bg-black"
                defaultValue={selectedItem.name}
                required
              />
              <div className="text-yellow-300 text-xl uppercase">
                30ml Stock
              </div>
              <input
                type="number"
                name="count"
                className="px-5 py-2  text-yellow-300 text-[1.2em] no-arrow bg-black"
                defaultValue={selectedItem.count}
                required
              />
              <div className="text-yellow-300 text-xl uppercase">
                100ml
              </div>
               <input
                type="text"
                name="hundredml"
                className="px-5 py-2 text-green-300 text-[1.2em] no-arrow bg-black"
                defaultValue={selectedItem.hundredml}
                required
              />
              <div className="text-yellow-300 text-xl uppercase">
                Price 30ml
              </div>
              <input
                type="number"
                name="price"
                className="px-5 py-2 text-yellow-300 no-arrow text-[1.2em] bg-black"
                defaultValue={selectedItem.price}
                required
              />
              <div className="text-yellow-300 text-xl uppercase">Limit </div>
              <input
                type="number"
                name="limit"
                className="px-5 py-2 text-yellow-300 no-arrow text-[1.2em] bg-black"
                defaultValue={selectedItem.limit}
                required
              />
            </div>
            <div>
              <textarea
                rows={10}
                className="px-5 py-2 text-green-300 text-[1.2em] no-arrow bg-black"
                defaultValue={selectedItem.remarks}
                name="remarks"
                id=""
              ></textarea>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5 text-center">
            <div
              onClick={() => {
                deleteStock();
              }}
              className="text-red-600 uppercase px-5 py-2 border-2 border-red-600 rounded-xl hover:bg-red-600 duration-200 hover:text-black cursor-pointer"
            >
              delete
            </div>
            <button className="text-green-600 uppercase px-5 py-2 border-2 border-green-600 rounded-xl hover:bg-green-600 duration-200 hover:text-black">
              update
            </button>
          </div>
        </form>
        <div
          onClick={resetModal}
          className="text-black uppercase px-5 py-5 m-5 border-2 border-black rounded-xl hover:bg-black duration-200 hover:text-white text-center cursor-pointer"
        >
          cancel
        </div>
      </div>
    </div>
  );
}

function CreateSection() {
  const [addMedicineName, setaddMedicineName] = useState("");
  const dispatch = useAppDispatch();

  function addStock() {
    if (addMedicineName == "") return;
    dispatch(createStockItem(addMedicineName));
    setaddMedicineName("");
  }
  return (
    <div className="flex gap-5 justify-evenly items-center">
      <div className="text-white font-bold">Add medicine: </div>
      <input
        type="text"
        value={addMedicineName}
        onChange={(e) => {
          setaddMedicineName(e.target.value);
        }}
        className="rounded-sm bg-[#aae994] text-black font-bold text-[1.2em]"
      />
      <button
        onClick={addStock}
        className="text-green-600 uppercase px-10 py-2 border-2 border-green-600 hover:bg-green-600 duration-200 rounded-xl hover:text-black"
      >
        Add
      </button>
    </div>
  );
}

function SearchSection({
  setFilter,
  regexString,
  setregexString,
}: {
  setFilter: setState<{
    type: string;
    order: string;
  }>;
  regexString: string;
  setregexString: setState<string>;
}) {
  return (
    <div className="flex justify-evenly gap-5 items-center">
      <div className="text-white font-bold">Search : </div>
      <input
        type="text"
        value={regexString}
        onChange={(e) => {
          setregexString(e.target.value);
        }}
        className="rounded-sm bg-[#aae994] text-black font-bold text-[1.2em]"
      />
      <select
        name=""
        id=""
        className="my-2 px-5 py-2 rounded-xl text-[#f2ff00] bg-[#212121]"
        onChange={(e) => {
          setFilter((prev) => {
            return { ...prev, type: e.target.value };
          });
        }}
      >
        <option value="count">30ml </option>
        <option value="name">Name</option>
        <option value="price">Price</option>
        <option value="hundredml">100ml</option>
        <option value="updatedAt">Updated</option>
      </select>
      <select
        className="my-2 px-5 py-2 rounded-xl text-[#f2ff00] bg-[#212121]"
        onChange={(e) => {
          setFilter((prev) => {
            return { ...prev, order: e.target.value };
          });
        }}
      >
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>
    </div>
  );
}

interface StockTableProps {
  filter: { type: string; order: string };
  regexString: string;
  setselectedItem: setState<StockItem | null>;
  setshowModal: setState<boolean>;
}
function StockTable(props: StockTableProps) {
  const { filter, regexString, setselectedItem, setshowModal } = props;
  let stockData: StockItem[] = useAppSelector((state) => state.stocks.data);
  stockData = sortStockItems(stockData, filter);
  const rowElements = stockData.map((item) => {
    const regex = new RegExp(regexString, "i");
    if (!(regex.test(item.name) && regexString != "")) return;
    return (
      <StockRowItem
        key={item.id}
        item={item}
        setselectedItem={setselectedItem}
        setshowModal={setshowModal}
      />
    );
  });
  return (
    <>
      <div className="grid grid-cols-5 bg-slate-900 p-5 text-center">
        <div className="text-white text-lg font-bold">Name</div>
        <div className="text-white text-lg font-bold">30 ml</div>
        <div className="text-white text-lg font-bold">Price</div>
        <div className="text-white text-lg font-bold">100 ml</div>
        <div className="text-white text-lg font-bold">UpdatedAt</div>
      </div>
      <div className="h-[50vh] overflow-y-auto">{rowElements}</div>
    </>
  );
}

function StockRowItem({
  item,
  setselectedItem,
  setshowModal,
}: {
  item: StockItem;
  setselectedItem: setState<StockItem | null>;
  setshowModal: setState<boolean>;
}) {
  return (
    <div
      key={item.id}
      onClick={() => {
        setselectedItem(item);
        setshowModal(true);
      }}
      className="grid grid-cols-5 text-md hover:bg-[#252525] duration-200 rounded-md p-5 cursor-pointer text-center"
    >
      <div className="text-yellow-300 text-md font-bold">{item.name}</div>
      <div
        className={
          "text-md font-bold duration-[1ms] " +
          `${
            item.count <= (item.limit ?? 15) ? "pulse-text" : "text-green-300"
          }`
        }
      >
        {item.count}
      </div>
      <div className="text-yellow-300 text-md font-bold">{item.price}</div>
      <div className="text-white text-md font-bold">{item.hundredml}</div>
      <div className="text-yellow-300 text-md font-bold">
        {moment(new Date(parseInt(item.updatedAt))).format(
          "YYYY-MM-DD || HH:mm:ss"
        )}
      </div>
    </div>
  );
}
