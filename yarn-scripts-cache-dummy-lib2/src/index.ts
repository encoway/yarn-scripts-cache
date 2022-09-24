
export function randomPick<Type>(array: Type[]): Type {
    // return array[0]
    return array[Math.floor(Math.random() * array.length)]
}
