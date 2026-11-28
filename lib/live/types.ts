import { ObjectId } from "mongodb";

export type LiveStatus = "waiting" | "live" | "ended";

export interface Live {
_id?: ObjectId;

streamerId: string;
streamerName: string;
streamerAvatar?: string | null;

title: string;
description?: string;
thumbnail?: string;

streamKey: string;

status: LiveStatus;

viewersCount: number;
maxViewers: number;

createdAt: Date;
startedAt?: Date | null;
endedAt?: Date | null;
}

export interface LiveMessage {
_id?: ObjectId;

liveId: ObjectId;
userId: string;
username: string;
avatar?: string;

message: string;

createdAt: Date;
}

export interface LiveViewer {
_id?: ObjectId;

liveId: ObjectId;
userId: string;
socketId: string;

joinedAt: Date;
}
