import { NextProxy } from "next/server";

type MiddlewareFactory = (middleware: NextProxy) => NextProxy;
