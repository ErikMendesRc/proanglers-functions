import "./config/admin";

import { onCatchWriteEnqueueUpdate } from "./functions/catchTriggers";
import { processRankingUpdateTask } from "./functions/rankTaskHandler";
import { scheduledMaintainTournaments } from "./functions/scheduledMaintainTournaments";
import { onTournamentFinalizedUpdateNational } from "./functions/tournaments";
import { onUserWritePagarmeCustomer } from "./functions/onWritePagarmeCustomer";

export { onCatchWriteEnqueueUpdate };
export { onTournamentFinalizedUpdateNational };
export { processRankingUpdateTask };
export { scheduledMaintainTournaments };
export { onUserWritePagarmeCustomer };
