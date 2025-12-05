import { StatisticsService } from "./StatisticsService"

/**
 * A registry containing all available StatisticServices. StatisticService implementations can register themselves to make them available.
 */
export type StatisticsServiceRegistry = StatisticsService[]
