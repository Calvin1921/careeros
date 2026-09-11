import { Injectable } from "@nestjs/common";
import { pool, transaction } from "@careeros/data";
import { parseConfirmedFacts } from "./conversation-facts.rules";
const select =
  'SELECT field,value,evidence,confirmed_at AS "confirmedAt" FROM conversation_profile_facts ORDER BY field';
@Injectable()
export class ConversationFactsService {
  async get() {
    return { facts: (await pool.query(select)).rows };
  }
  async replace(input: unknown) {
    const facts = parseConfirmedFacts(input);
    return transaction(async (db) => {
      // Serialize full replacements for the single-user workspace.
      await db.query("SELECT pg_advisory_xact_lock(78341040)");
      await db.query("DELETE FROM conversation_profile_facts");
      for (const fact of facts)
        await db.query(
          "INSERT INTO conversation_profile_facts(field,value,evidence) VALUES($1,$2,$3)",
          [fact.field, fact.value, fact.evidence],
        );
      return { facts: (await db.query(select)).rows };
    });
  }
}
