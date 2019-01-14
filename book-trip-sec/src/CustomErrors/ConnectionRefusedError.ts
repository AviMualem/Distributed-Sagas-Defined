export  class ConnectionRefusedError extends Error {
    constructor(m: string) {
        super(m);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, ConnectionRefusedError.prototype);
    }
}