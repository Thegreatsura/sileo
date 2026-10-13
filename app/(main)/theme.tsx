"use client";

import { createContext, useContext } from "react";

/*
 * The layout owns the light/dark switch, and until now it was the only thing
 * that needed it — it mounted the one `Toaster` itself.
 *
 * The home page mounts its own instead, so the toasts land inside the stage
 * rather than at the window's corner, and it needs the same value to theme it.
 * One context rather than a second source of truth: two readings of the class
 * on `<html>` would be one bug away from the page and the layout disagreeing
 * about which theme the toast is in.
 */
export const ThemeContext = createContext(false);

export const useDark = () => useContext(ThemeContext);
