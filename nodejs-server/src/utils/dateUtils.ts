/**
 * Formats a Date object into 'YYYY.MM.DD' string format.
 * @param date - The Date object to format.
 * @returns A string representing the formatted date.
 */
export const formatDateYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    // Months are zero-based in JavaScript, so add 1 and pad with zero if needed
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
};

/**
 * Formats a Date object into 'DD.MM.YYYY' string format.
 * @param date - The Date object to format.
 * @returns A string representing the formatted date.
 */
export const formatDateDDMMYYYY = (date: Date): string => {
    // Months are zero-based in JavaScript, so add 1 and pad with zero if needed
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}