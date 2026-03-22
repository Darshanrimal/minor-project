import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Charity } from "../target/types/charity";
import { assert } from "chai";

describe("charity", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Charity as Program<Charity>;

  it("Initializes a campaign", async () => {
    const campaignId = new anchor.BN(1);
    const organization = provider.wallet.publicKey;

    const [campaignPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        organization.toBuffer(),
        campaignId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 86400 * 30);

    await program.methods
      .initializeCampaign(
        campaignId,
        "Test School Build",
        "Build a school in Karnali",
        "education",
        new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 10), // 10 SOL goal
        deadline,
        "QmTestCID",
        [33, 34, 33] // milestones
      )
      .accounts({
        organization,
        campaign: campaignPda,
        platformTreasury: organization, // use self as treasury in test
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const campaign = await program.account.campaign.fetch(campaignPda);
    assert.equal(campaign.title, "Test School Build");
    assert.equal(campaign.isActive, true);
    assert.equal(campaign.milestones.length, 3);
    console.log("✅ Campaign initialized:", campaignPda.toBase58());
  });
});
