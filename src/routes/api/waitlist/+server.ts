import { collections } from "$lib/server/database";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { ObjectId } from "mongodb";

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email, phone, repetition } = await request.json();

		// Validate input
		if (!email || !phone || !repetition) {
			return json({ error: "Email, phone, and repetition are required" }, { status: 400 });
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return json({ error: "Invalid email format" }, { status: 400 });
		}

		// Check if email already exists
		const existingEntry = await collections.waitlist.findOne({ email });
		if (existingEntry) {
			return json({ error: "Email already registered" }, { status: 409 });
		}

		// Insert new waitlist entry
		const now = new Date();
		const waitlistEntry = {
			_id: new ObjectId(),
			email,
			phone,
			repetition,
			createdAt: now,
			updatedAt: now,
		};

		await collections.waitlist.insertOne(waitlistEntry);

		return json({ success: true, message: "Successfully added to waitlist" });
	} catch (error) {
		console.error("Error adding to waitlist:", error);
		return json({ error: "Internal server error" }, { status: 500 });
	}
};
