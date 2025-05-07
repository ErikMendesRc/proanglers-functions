import {CaptureStatusEnum} from "../../types/enums";

export interface ICatchUpdaterRepository {
    updateCatchStatus(catchId: string, status: typeof CaptureStatusEnum[keyof typeof CaptureStatusEnum]): Promise<void>;
    markCatchAsReplaced(catchId: string, replacedBecauseOfCatchId: string): Promise<void>;
}
