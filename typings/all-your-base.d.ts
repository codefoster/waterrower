declare module 'all-your-base' {
    var ayb:AllYourBase;
    export = ayb;
}

declare interface AllYourBase {
    hexToDec(value:string): number,
    decToHex(value:number): string
}