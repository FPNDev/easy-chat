import axios from "axios";

const network = axios.create({
  baseURL: import.meta.env.VITE_LLAMA_BASE_URL,
  timeout: 0,
});

export default network;