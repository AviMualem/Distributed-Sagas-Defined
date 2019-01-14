export class SocketTimeoutError extends Error {
    constructor(m: string) {
        super(m);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, SocketTimeoutError.prototype);
    }
}