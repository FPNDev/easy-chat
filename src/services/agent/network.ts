import axios from "axios";

const network = axios.create({
  baseURL: import.meta.env.VITE_LLAMA_BASE_URL,
});

export default network;