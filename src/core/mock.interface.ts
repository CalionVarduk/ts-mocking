import { IMockedMethodInfo } from './mocked-method-info.interface';
import { IMockedPropertyInfo } from './mocked-property-info.interface';

/** Represents a mock proxy. */
export interface IMock<T> {
    /** Specifies the mocked object. */
    readonly subject: T;
    /** Specifies mocked subject members. */
    readonly mockedMembers: ReadonlyArray<keyof T>;
    /**
     * Returns mocked information store for a mocked method or a mocked property.
     * @param memberName subject's member name
     * @returns mocked method or property information store
     * */
    getMemberInfo(memberName: keyof T): IMockedMethodInfo | IMockedPropertyInfo | null;
}
