declare module 'serialport' {
    module parsers {
        function readline(delimiter:string);
    }   
     
    class SerialPort {
        constructor(path: string, options?: Object, openImmediately?: boolean, callback?: () => {})
        isOpen: boolean;
        on(event: string, callback?: () => void);
        open(callback?: () => void);
        write(buffer: any, callback?: () => void)
        pause();
        resume();
        disconnected(err: Error);
        close(callback?: () => void);
        flush(callback?: () => void);
        set(options: Object, callback: () => void);
        drain(callback?: () => void);
        update(options: Object, callback?: () => void);
        list(callback?: () => void);
    }
}




