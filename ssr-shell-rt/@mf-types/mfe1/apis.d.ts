
    export type RemoteKeys = 'mfe1/clientEntry';
    type PackageType<T> = T extends 'mfe1/clientEntry' ? typeof import('mfe1/clientEntry') :any;