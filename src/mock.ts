import { MockedInfoType } from './mocked-info-type.enum';
import { IMockedMethodInfo } from './mocked-method-info.interface';
import { IMockedPropertyInfo } from './mocked-property-info.interface';
import { IInvocationData } from './invocation-data.interface';
import { IMock } from './mock.interface';
import { Nullable } from 'frl-ts-utils/lib/types/nullable';
import { reinterpretCast } from 'frl-ts-utils/lib/functions/reinterpret-cast';
import { isUndefined } from 'frl-ts-utils/lib/functions/is-undefined';
import { isPrimitiveOfType } from 'frl-ts-utils/lib/functions/primitive-cast';
import { Assert } from 'frl-ts-utils/lib/functions/assert';

let GLOBAL_INVOCATION_NO = 0;

function createMethodInfo(type: MockedInfoType, data: IInvocationData[]): IMockedMethodInfo
{
    return Object.freeze(
        {
            type: type,
            get count(): number
            {
                return data.length;
            },
            getData(no: number): Nullable<IInvocationData>
            {
                return data[no] || null;
            },
            clear(): void
            {
                data.splice(0, data.length);
            }
        });
}

function createFunctionMock(func: Function, subject: any, data: IInvocationData[]): Function
{
    return function()
    {
        const result = func.bind(subject)(...arguments);
        data.push(Object.freeze(
            {
                no: data.length,
                globalNo: GLOBAL_INVOCATION_NO++,
                timestamp: new Date().valueOf(),
                result: Object.freeze(result),
                arguments: Object.freeze([...arguments])
            }));
        return result;
    };
}

function createMethodMock(
    invocationCache: { [id: string]: IMockedMethodInfo | IMockedPropertyInfo },
    subject: any, func: Function, name: string):
    Function
{
    const data: IInvocationData[] = [];
    invocationCache[name] = createMethodInfo(MockedInfoType.Method, data);
    return createFunctionMock(func, subject, data);
}

function createPropertyMock(
    invocationCache: { [id: string]: IMockedMethodInfo | IMockedPropertyInfo },
    subject: any, prop: PropertyDescriptor, name: string):
    { getter?(): any; setter?(value: any): void }
{
    const info: any =
    {
        type: MockedInfoType.Property,
        get: null,
        set: null
    };
    const result: { getter?(): any; setter?(value: any): void } = {};
    if (prop.get)
    {
        const data: IInvocationData[] = [];
        info.get = createMethodInfo(MockedInfoType.PropertyGetter, data);
        result.getter = reinterpretCast<() => void>(createFunctionMock(prop.get, subject, data));
    }
    if (prop.set)
    {
        const data: IInvocationData[] = [];
        info.set = createMethodInfo(MockedInfoType.PropertySetter, data);
        result.setter = reinterpretCast<(value: any) => void>(createFunctionMock(prop.set, subject, data));
    }
    invocationCache[name] = Object.freeze(info);
    return result;
}

/**
 * Allows to create a mocked object.
 * @param setup mock setup
 * @returns mocked object
 * */
export function mock<T>(setup: Partial<T>): IMock<T>
{
    return partialMock<T>(reinterpretCast<T>({}), setup);
}

/**
 * Allows to create a partially mocked object.
 * @param subject an object to partially mock
 * @param setup mock setup
 * @returns mocked object
 * */
export function partialMock<T>(subject: T, setup: Partial<T>): IMock<T>
{
    Assert.IsDefined(subject, 'subject');
    Assert.IsDefined(setup, 'setup');
    Assert.False(Object.isFrozen(subject), 'mock subject can\'t be frozen');

    const members = new Set<string>();
    const invocationCache: { [id: string]: IMockedMethodInfo | IMockedPropertyInfo } = {};
    const result: any =
    {
        getMemberInfo(m: string): Nullable<IMockedMethodInfo | IMockedPropertyInfo>
        {
            return invocationCache[m] || null;
        }
    };
    for (const key of Object.getOwnPropertyNames(setup))
    {
        members.add(key);
        const descriptor = Object.getOwnPropertyDescriptor(setup, key)!;
        if (isUndefined(descriptor.value))
        {
            const propertyMock = createPropertyMock(invocationCache, subject, descriptor, key);
            Object.defineProperty(subject, key,
                {
                    get: propertyMock.getter,
                    set: propertyMock.setter
                });
        } else
        {
            Object.defineProperty(subject, key,
                {
                    value: isPrimitiveOfType('function', descriptor.value) ?
                        createMethodMock(invocationCache, subject, descriptor.value, key) :
                        descriptor.value
                });
        }
    }
    result.subject = subject;
    result.mockedMembers = Object.freeze(members);
    return Object.freeze(result);
}

/** Resets global mock invocation no counter. */
export function resetGlobalMockInvocationNo(): void
{
    GLOBAL_INVOCATION_NO = 0;
}

/** Returns current global invocation no counter. */
export function getGlobalMockInvocationNo(): number
{
    return GLOBAL_INVOCATION_NO;
}
