export class InternalServerFailureError extends Error {
    constructor(m: string) {
        super(m);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, InternalServerFailureError.prototype);
    }
}