import { NextResponse } from "next/server";
import type { ApiResponse } from "./types";

export const jsonSuccess = <T>(
  data?: T,
  message?: string
) => {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return NextResponse.json(payload);
};

export const jsonError = (status: number, error: string) => {
  const payload: ApiResponse = {
    success: false,
    error,
  };
  return NextResponse.json(payload, { status });
};
