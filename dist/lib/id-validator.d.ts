declare class IdValidator {
    enabled: boolean;
    enable: () => void;
    disable: () => void;
    validate: (schema: any, options: any) => any;
    validateSchema: (schema: any, message?: any, connection?: any, allowDuplicates?: any) => any;
}
declare function IdValidator(this: any): void;
export declare const getConstructor: typeof IdValidator;
declare const _default: (schema: any, options: any) => any;
export default _default;
