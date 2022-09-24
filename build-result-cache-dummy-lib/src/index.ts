import {randomPick} from "@rgischk/build-result-cache-dummy-lib2";

const GREETINGS = [
    "Hello",
    "Hi",
    "Hey",
    "Moin"
]

export function randomGreeting() {
    return randomPick(GREETINGS)
}
