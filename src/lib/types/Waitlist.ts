import type { ObjectId } from "mongodb";
import type { Timestamps } from "./Timestamps";

export interface Waitlist extends Timestamps {
	_id: ObjectId;
	email: string;
	phone: string;
	repetition: string;
}
