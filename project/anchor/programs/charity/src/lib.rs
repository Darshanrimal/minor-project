// programs/charity/src/lib.rs
// NepalDaan — Blockchain Based Charity Donation System
// Tribhuvan University Minor Project [CT-654]
//
// Instructions (matching PDF Chapter 6 spec):
//   1. initialize_admin   — set up platform administrator
//   2. create_campaign    — org creates a fundraising campaign
//   3. approve_campaign   — admin approves campaign before it goes public
//   4. donate             — donor transfers SOL to campaign vault
//   5. withdraw           — org withdraws released funds
//   6. release_milestone  — org marks milestone done with evidence CID
//   7. close_campaign     — admin or org deactivates a campaign

use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("CHARiTY1111111111111111111111111111111111111");

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_TITLE:       usize = 100;
const MAX_DESC:        usize = 500;
const MAX_CATEGORY:    usize = 30;
const MAX_CID:         usize = 80;
const MAX_MILESTONES:  usize = 10;
const PLATFORM_FEE_BPS: u64  = 100; // 1% fee

#[program]
pub mod charity {
    use super::*;

    // ── 1. Initialize Admin ───────────────────────────────────────────────────
    /// Sets up the platform admin account (called once at deployment)
    pub fn initialize_admin(ctx: Context<InitializeAdmin>) -> Result<()> {
        let admin_account    = &mut ctx.accounts.admin_account;
        admin_account.authority = ctx.accounts.authority.key();
        admin_account.bump      = ctx.bumps.admin_account;
        emit!(AdminInitialized {
            authority: admin_account.authority,
        });
        Ok(())
    }

    // ── 2. Create Campaign ────────────────────────────────────────────────────
    /// Organization creates a new campaign (starts as pending approval)
    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id:          u64,
        title:                String,
        description:          String,
        category:             String,
        goal_lamports:        u64,
        deadline:             i64,
        image_cid:            String,
        milestone_percentages: Vec<u8>,
    ) -> Result<()> {
        require!(title.len()       <= MAX_TITLE,    CharityError::TitleTooLong);
        require!(description.len() <= MAX_DESC,     CharityError::DescriptionTooLong);
        require!(category.len()    <= MAX_CATEGORY, CharityError::CategoryTooLong);
        require!(image_cid.len()   <= MAX_CID,      CharityError::CidTooLong);
        require!(goal_lamports > 0,                  CharityError::InvalidGoal);
        require!(deadline > Clock::get()?.unix_timestamp, CharityError::DeadlineInPast);
        require!(milestone_percentages.len() <= MAX_MILESTONES, CharityError::TooManyMilestones);

        if !milestone_percentages.is_empty() {
            let total: u8 = milestone_percentages.iter().sum();
            require!(total == 100, CharityError::MilestonePercentageError);
        }

        let campaign          = &mut ctx.accounts.campaign;
        let clock             = Clock::get()?;
        campaign.campaign_id  = campaign_id;
        campaign.organization = ctx.accounts.organization.key();
        campaign.title        = title;
        campaign.description  = description;
        campaign.category     = category;
        campaign.goal_lamports  = goal_lamports;
        campaign.raised_lamports = 0;
        campaign.deadline       = deadline;
        campaign.image_cid      = image_cid;
        campaign.is_approved    = false; // requires admin approval
        campaign.is_active      = false;
        campaign.created_at     = clock.unix_timestamp;
        campaign.bump           = ctx.bumps.campaign;
        campaign.milestones     = milestone_percentages.iter().map(|&pct| Milestone {
            percentage:  pct,
            is_released: false,
            evidence_cid: String::new(),
            released_at: 0,
        }).collect();

        emit!(CampaignCreated {
            campaign:     campaign.key(),
            organization: campaign.organization,
            campaign_id,
            goal_lamports,
        });
        Ok(())
    }

    // ── 3. Approve Campaign ───────────────────────────────────────────────────
    /// Admin reviews and approves a campaign, making it visible to donors
    pub fn approve_campaign(ctx: Context<ApproveCampaign>, approved: bool) -> Result<()> {
        // Verify the signer is the platform admin
        require!(
            ctx.accounts.admin_account.authority == ctx.accounts.admin.key(),
            CharityError::Unauthorized
        );
        let campaign         = &mut ctx.accounts.campaign;
        campaign.is_approved = approved;
        campaign.is_active   = approved;

        emit!(CampaignApproved {
            campaign: campaign.key(),
            approved,
        });
        Ok(())
    }

    // ── 4. Donate ─────────────────────────────────────────────────────────────
    /// Donor sends SOL to the campaign vault; 1% platform fee deducted
    pub fn donate(
        ctx:             Context<Donate>,
        amount_lamports: u64,
        message:         String,
    ) -> Result<()> {
        let campaign = &ctx.accounts.campaign;
        require!(campaign.is_approved,  CharityError::CampaignNotApproved);
        require!(campaign.is_active,    CharityError::CampaignInactive);
        require!(
            Clock::get()?.unix_timestamp < campaign.deadline,
            CharityError::CampaignExpired
        );
        require!(amount_lamports >= 1_000_000, CharityError::DonationTooSmall);
        require!(message.len() <= 200,         CharityError::MessageTooLong);

        let fee_lamports = amount_lamports * PLATFORM_FEE_BPS / 10_000;
        let net_lamports = amount_lamports - fee_lamports;

        // Transfer net amount to campaign vault
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.donor.to_account_info(),
                    to:   ctx.accounts.campaign_vault.to_account_info(),
                },
            ),
            net_lamports,
        )?;

        // Transfer fee to platform treasury
        if fee_lamports > 0 {
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.donor.to_account_info(),
                        to:   ctx.accounts.platform_treasury.to_account_info(),
                    },
                ),
                fee_lamports,
            )?;
        }

        // Record donation in a Donation Account (PDA)
        let donation         = &mut ctx.accounts.donation_record;
        donation.campaign    = ctx.accounts.campaign.key();
        donation.donor       = ctx.accounts.donor.key();
        donation.amount      = amount_lamports;
        donation.net_amount  = net_lamports;
        donation.message     = message;
        donation.donated_at  = Clock::get()?.unix_timestamp;
        donation.bump        = ctx.bumps.donation_record;

        // Update campaign totals
        let campaign_mut           = &mut ctx.accounts.campaign;
        campaign_mut.raised_lamports = campaign_mut
            .raised_lamports
            .checked_add(net_lamports)
            .ok_or(CharityError::Overflow)?;

        emit!(DonationMade {
            campaign:   campaign_mut.key(),
            donor:      ctx.accounts.donor.key(),
            amount:     amount_lamports,
            net_amount: net_lamports,
            donated_at: donation.donated_at,
        });
        Ok(())
    }

    // ── 5. Withdraw ───────────────────────────────────────────────────────────
    /// Organization withdraws funds proportional to released milestones
    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let campaign = &ctx.accounts.campaign;
        require!(
            ctx.accounts.organization.key() == campaign.organization,
            CharityError::Unauthorized
        );

        let releasable_pct: u64 = if campaign.milestones.is_empty() {
            require!(
                Clock::get()?.unix_timestamp >= campaign.deadline,
                CharityError::CampaignNotEnded
            );
            100
        } else {
            campaign.milestones.iter()
                .filter(|m| m.is_released)
                .map(|m| m.percentage as u64)
                .sum()
        };

        let available    = campaign.raised_lamports * releasable_pct / 100;
        require!(available > 0, CharityError::NothingToWithdraw);

        let vault_bal    = ctx.accounts.campaign_vault.lamports();
        let withdraw_amt = available.min(vault_bal);

        **ctx.accounts.campaign_vault.to_account_info().try_borrow_mut_lamports()? -= withdraw_amt;
        **ctx.accounts.organization.to_account_info().try_borrow_mut_lamports()?   += withdraw_amt;

        emit!(Withdrawal {
            campaign:  campaign.key(),
            recipient: ctx.accounts.organization.key(),
            amount:    withdraw_amt,
        });
        Ok(())
    }

    // ── 6. Release Milestone ──────────────────────────────────────────────────
    /// Organization marks a milestone as complete, unlocking those funds
    pub fn release_milestone(
        ctx:          Context<ReleaseMilestone>,
        milestone_idx: u8,
        evidence_cid: String,
    ) -> Result<()> {
        require!(evidence_cid.len() <= MAX_CID,   CharityError::CidTooLong);
        let campaign = &mut ctx.accounts.campaign;
        let idx      = milestone_idx as usize;
        require!(idx < campaign.milestones.len(),  CharityError::InvalidMilestone);
        require!(!campaign.milestones[idx].is_released, CharityError::MilestoneAlreadyReleased);
        require!(
            ctx.accounts.organization.key() == campaign.organization,
            CharityError::Unauthorized
        );

        campaign.milestones[idx].is_released  = true;
        campaign.milestones[idx].evidence_cid = evidence_cid;
        campaign.milestones[idx].released_at  = Clock::get()?.unix_timestamp;

        emit!(MilestoneReleased {
            campaign:      campaign.key(),
            milestone_idx,
            released_at:   campaign.milestones[idx].released_at,
        });
        Ok(())
    }

    // ── 7. Close Campaign ─────────────────────────────────────────────────────
    /// Admin or org owner can deactivate a campaign
    pub fn close_campaign(ctx: Context<CloseCampaign>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(
            ctx.accounts.authority.key() == campaign.organization ||
            ctx.accounts.authority.key() == ctx.accounts.admin_account.authority,
            CharityError::Unauthorized
        );
        campaign.is_active = false;
        Ok(())
    }
}

// ── Account Contexts ──────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeAdmin<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = AdminAccount::SPACE,
        seeds = [b"admin"],
        bump,
    )]
    pub admin_account: Account<'info, AdminAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct CreateCampaign<'info> {
    #[account(mut)]
    pub organization: Signer<'info>,

    #[account(
        init,
        payer  = organization,
        space  = Campaign::SPACE,
        seeds  = [b"campaign", organization.key().as_ref(), &campaign_id.to_le_bytes()],
        bump,
    )]
    pub campaign: Account<'info, Campaign>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveCampaign<'info> {
    pub admin: Signer<'info>,

    #[account(seeds = [b"admin"], bump = admin_account.bump)]
    pub admin_account: Account<'info, AdminAccount>,

    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
}

#[derive(Accounts)]
pub struct Donate<'info> {
    #[account(mut)]
    pub donor: Signer<'info>,

    #[account(mut)]
    pub campaign: Account<'info, Campaign>,

    /// CHECK: campaign SOL vault PDA
    #[account(
        mut,
        seeds = [b"vault", campaign.key().as_ref()],
        bump,
    )]
    pub campaign_vault: UncheckedAccount<'info>,

    /// CHECK: platform treasury wallet
    #[account(mut)]
    pub platform_treasury: UncheckedAccount<'info>,

    #[account(
        init,
        payer  = donor,
        space  = DonationRecord::SPACE,
        seeds  = [b"donation", campaign.key().as_ref(), donor.key().as_ref()],
        bump,
    )]
    pub donation_record: Account<'info, DonationRecord>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub organization: Signer<'info>,

    #[account(mut)]
    pub campaign: Account<'info, Campaign>,

    /// CHECK: campaign vault
    #[account(
        mut,
        seeds = [b"vault", campaign.key().as_ref()],
        bump,
    )]
    pub campaign_vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseMilestone<'info> {
    #[account(mut)]
    pub organization: Signer<'info>,

    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
}

#[derive(Accounts)]
pub struct CloseCampaign<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(seeds = [b"admin"], bump = admin_account.bump)]
    pub admin_account: Account<'info, AdminAccount>,

    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
}

// ── On-chain Account Structs ──────────────────────────────────────────────────

#[account]
pub struct AdminAccount {
    pub authority: Pubkey,
    pub bump:      u8,
}

impl AdminAccount {
    pub const SPACE: usize = 8 + 32 + 1 + 32;
}

#[account]
pub struct Campaign {
    pub campaign_id:     u64,
    pub organization:    Pubkey,
    pub title:           String,
    pub description:     String,
    pub category:        String,
    pub goal_lamports:   u64,
    pub raised_lamports: u64,
    pub deadline:        i64,
    pub image_cid:       String,
    pub is_approved:     bool,
    pub is_active:       bool,
    pub created_at:      i64,
    pub milestones:      Vec<Milestone>,
    pub bump:            u8,
}

impl Campaign {
    // discriminator(8) + u64(8) + pubkey(32) + str(4+100) + str(4+500) + str(4+30)
    // + u64*2(16) + i64(8) + str(4+80) + bool*2(2) + i64(8)
    // + vec(4 + 10*(1+1+4+80+8)) = vec(4 + 10*94=944)
    // + u8(1) + padding(64)
    pub const SPACE: usize = 8 + 8 + 32 + 104 + 504 + 34 + 16 + 8 + 84 + 2 + 8 + 948 + 1 + 64;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Milestone {
    pub percentage:   u8,
    pub is_released:  bool,
    pub evidence_cid: String,
    pub released_at:  i64,
}

#[account]
pub struct DonationRecord {
    pub campaign:   Pubkey,
    pub donor:      Pubkey,
    pub amount:     u64,
    pub net_amount: u64,
    pub message:    String,
    pub donated_at: i64,
    pub bump:       u8,
}

impl DonationRecord {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 8 + (4 + 200) + 8 + 1 + 32;
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct AdminInitialized { pub authority: Pubkey }

#[event]
pub struct CampaignCreated {
    pub campaign:      Pubkey,
    pub organization:  Pubkey,
    pub campaign_id:   u64,
    pub goal_lamports: u64,
}

#[event]
pub struct CampaignApproved {
    pub campaign: Pubkey,
    pub approved: bool,
}

#[event]
pub struct DonationMade {
    pub campaign:   Pubkey,
    pub donor:      Pubkey,
    pub amount:     u64,
    pub net_amount: u64,
    pub donated_at: i64,
}

#[event]
pub struct MilestoneReleased {
    pub campaign:      Pubkey,
    pub milestone_idx: u8,
    pub released_at:   i64,
}

#[event]
pub struct Withdrawal {
    pub campaign:  Pubkey,
    pub recipient: Pubkey,
    pub amount:    u64,
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum CharityError {
    #[msg("Title must be 100 characters or fewer")]
    TitleTooLong,
    #[msg("Description must be 500 characters or fewer")]
    DescriptionTooLong,
    #[msg("Category must be 30 characters or fewer")]
    CategoryTooLong,
    #[msg("CID must be 80 characters or fewer")]
    CidTooLong,
    #[msg("Goal must be greater than zero")]
    InvalidGoal,
    #[msg("Deadline must be in the future")]
    DeadlineInPast,
    #[msg("Maximum 10 milestones allowed")]
    TooManyMilestones,
    #[msg("Milestone percentages must sum to exactly 100")]
    MilestonePercentageError,
    #[msg("Campaign has not been approved by admin yet")]
    CampaignNotApproved,
    #[msg("Campaign is not active")]
    CampaignInactive,
    #[msg("Campaign deadline has passed")]
    CampaignExpired,
    #[msg("Campaign has not ended yet")]
    CampaignNotEnded,
    #[msg("Minimum donation is 0.001 SOL (1,000,000 lamports)")]
    DonationTooSmall,
    #[msg("Message must be 200 characters or fewer")]
    MessageTooLong,
    #[msg("Milestone index out of range")]
    InvalidMilestone,
    #[msg("Milestone has already been released")]
    MilestoneAlreadyReleased,
    #[msg("Unauthorized — you are not the owner or admin")]
    Unauthorized,
    #[msg("No funds available to withdraw")]
    NothingToWithdraw,
    #[msg("Arithmetic overflow")]
    Overflow,
}
