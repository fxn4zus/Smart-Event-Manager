import net from "net";

export interface EmailCheckResult {
  success: boolean;
  reason: string;
}

export function verifyEmailSMTP(email: string): Promise<EmailCheckResult> {
  return new Promise((resolve) => {
    try {
      const parts = email.split("@");
      const domain = parts[1];
      if (!domain) {
        return resolve({ success: false, reason: "Invalid format" });
      }

      const mxServer = "gmail-smtp-in.l.google.com";
      const PORT = 25;
      const socket = net.createConnection(PORT, mxServer);

      let stage = 0;
      let buffer = "";

      socket.on("data", (data: Buffer) => {
        buffer += data.toString();

        // STEP 1: Server greeting (220)
        if (stage === 0 && buffer.includes("220")) {
          socket.write("HELO example.com\r\n");
          buffer = "";
          stage = 1;
          return;
        }

        // STEP 2: Respond to HELO (250)
        if (stage === 1 && buffer.includes("250")) {
          socket.write("MAIL FROM:<test@example.com>\r\n");
          buffer = "";
          stage = 2;
          return;
        }

        // STEP 3: MAIL FROM accepted
        if (stage === 2 && buffer.includes("250")) {
          socket.write(`RCPT TO:<${email}>\r\n`);
          buffer = "";
          stage = 3;
          return;
        }

        // STEP 4: RCPT TO result (the real check)
        if (stage === 3) {
          // Email does not exist
          if (buffer.includes("550-5.1.1")) {
            socket.end();
            return resolve({
              success: false,
              reason: "Email does NOT exist (550 5.1.1)",
            });
          }

          // Email exists
          if (buffer.includes("250 2.1.5")) {
            socket.end();
            return resolve({
              success: true,
              reason: "Email exists",
            });
          }
        }
      });

      socket.on("error", () => {
        return resolve({
          success: false,
          reason: "SMTP connection blocked or failed",
        });
      });

      socket.on("end", () => {
        // connection closed, no action needed
      });
    } catch (err) {
      return resolve({
        success: false,
        reason: "Unexpected error",
      });
    }
  });
}
