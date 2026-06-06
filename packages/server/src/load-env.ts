import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(import.meta.dirname, "../../../.env"),
  quiet: true,
});
