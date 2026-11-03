import axios from "axios";
import { AuctionItem, Bid } from "../types/auction";

// Define the base URL for the backend API. Allows overriding via Vite env
// for local/dev setups where the backend port is changed or already in use.
const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:3000/api";

// Create an axios instance with predefined configuration.
// This instance can be reused for all API calls.
const api = axios.create({
  baseURL: API_BASE_URL, // Set the base URL for all requests made with this instance
  headers: {
    "Content-Type": "application/json", // Set the default Content-Type header for requests
  },
});

/**
 * Fetches all auction items from the backend API.
 * @returns A promise that resolves to an array of AuctionItem objects.
 */
export const fetchAllItems = async (): Promise<AuctionItem[]> => {
  // Make a GET request to the '/items' endpoint.
  const response = await api.get<AuctionItem[]>("/items");
  // Return the data part of the response (the array of items).
  return response.data;
};

/**
 * Fetches a single auction item by its ID from the backend API.
 * @param id - The unique identifier of the auction item to fetch.
 * @returns A promise that resolves to a single AuctionItem object.
 */
export const fetchItemById = async (id: number): Promise<AuctionItem> => {
  // Make a GET request to the '/items/:id' endpoint, substituting :id with the provided id.
  const response = await api.get<AuctionItem>(`/items/${id}`);
  // Return the data part of the response (the single item).
  return response.data;
};

/**
 * Places a new bid on a specific auction item via the backend API.
 * @param itemId - The ID of the item to bid on.
 * @param bidAmount - The amount of the bid.
 * @param bidder - The name or identifier of the person placing the bid.
 * @returns A promise that resolves to the newly created Bid object.
 */
export const placeBid = async (
  itemId: number,
  bidAmount: number,
  bidder: string
): Promise<Bid> => {
  const response = await api.post<Bid>("/bids", {
    itemId,
    bidAmount,
    bidder,
  });
  return response.data;
};

export const adminLogin = async (
  username: string,
  password: string
): Promise<{ success: boolean; message?: string; error?: string }> => {
  const response = await api.post<{ success: boolean; message?: string; error?: string }>(
    "/admin/login",
    { username, password }
  );
  return response.data;
};

export const createAuctionItem = async (payload: {
  name: string;
  description: string;
  image?: string;
  startingBid: number;
}): Promise<{ success: boolean; item: AuctionItem }> => {
  const response = await api.post<{ success: boolean; item: AuctionItem }>(
    "/admin/items",
    payload
  );
  return response.data;
};

export const updateAuctionItem = async (
  id: number,
  payload: {
    name: string;
    description: string;
    image?: string;
    startingBid: number;
  }
): Promise<{ success: boolean; item: AuctionItem }> => {
  const response = await api.put<{ success: boolean; item: AuctionItem }>(
    `/admin/items/${id}`,
    payload
  );
  return response.data;
};

export const deleteAuctionItem = async (id: number): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>(`/admin/items/${id}`);
  return response.data;
};
