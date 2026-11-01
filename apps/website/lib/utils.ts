import { type ClassValue, clsx } from 'clsx';

/** Joins the classes a component was built with and the classes a page hands it. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
