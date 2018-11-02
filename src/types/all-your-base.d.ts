declare module 'all-your-base' {
    export function binToDec(bin:string):string;
    export function binToHex(bin:string):string;
    export function binToOct(bin:string):string;
    export function octToDec(oct:string):string;
    export function octToBin(oct:string):string;
    export function octToHex(oct:string):string;
    export function decToBin(dec:string|number):string;
    export function decToHex(dec:string|number):string;
    export function decToOct(dec:string|number):string;
    export function hexToDec(hex:string):string;
    export function hexToBin(hex:string):string;
    export function hexToOct(hex:string):string;
}