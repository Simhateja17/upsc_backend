BEGIN;

UPDATE "pricing_plans"
SET "is_active" = false
WHERE "tier" IN ('aspire', 'rise', 'ascent');

INSERT INTO "pricing_plans"
  ("id", "name", "price", "duration", "features", "is_popular", "order", "is_active", "duration_days", "tier", "billing_cycle", "original_price", "entitlements")
VALUES
  ('plan_aspire_monthly', 'Aspire Monthly', 199, '1 month', ARRAY['5 Mains AI Evaluations / day','5 Mock Test attempts / day','Jeet AI - 5 messages / day','Limited revision suite','Limited performance analytics'], false, 10, true, 30, 'aspire', 'monthly', 299, null),
  ('plan_aspire_quarterly', 'Aspire Quarterly', 479, '3 months', ARRAY['5 Mains AI Evaluations / day','5 Mock Test attempts / day','Jeet AI - 5 messages / day','Limited revision suite','Limited performance analytics'], false, 11, true, 90, 'aspire', 'quarterly', 747, null),
  ('plan_aspire_yearly', 'Aspire Yearly', 1439, '12 months', ARRAY['5 Mains AI Evaluations / day','5 Mock Test attempts / day','Jeet AI - 5 messages / day','Limited revision suite','Limited performance analytics'], false, 12, true, 365, 'aspire', 'yearly', 3588, null),
  ('plan_rise_monthly', 'Rise Monthly', 499, '1 month', ARRAY['25 Mains AI Evaluations / day','50 Prelims Mock Test attempts / day','Jeet AI - 100 messages / day','Full revision suite','Live Study Room'], true, 20, true, 30, 'rise', 'monthly', 699, null),
  ('plan_rise_quarterly', 'Rise Quarterly', 1197, '3 months', ARRAY['25 Mains AI Evaluations / day','50 Prelims Mock Test attempts / day','Jeet AI - 100 messages / day','Full revision suite','Live Study Room'], true, 21, true, 90, 'rise', 'quarterly', 1797, null),
  ('plan_rise_yearly', 'Rise Yearly', 3599, '12 months', ARRAY['25 Mains AI Evaluations / day','50 Prelims Mock Test attempts / day','Jeet AI - 100 messages / day','Full revision suite','Live Study Room'], true, 22, true, 365, 'rise', 'yearly', 8388, null),
  ('plan_ascent_monthly', 'Ascent Monthly', 1999, '1 month', ARRAY['Unlimited Mains Evaluations & Mock Tests','Jeet AI - unlimited messages','Weekly 1-on-1 mentorship','Personalised Study Roadmap','Priority Q&A'], false, 30, true, 30, 'ascent', 'monthly', 2499, null),
  ('plan_ascent_quarterly', 'Ascent Quarterly', 4799, '3 months', ARRAY['Unlimited Mains Evaluations & Mock Tests','Jeet AI - unlimited messages','Weekly 1-on-1 mentorship','Personalised Study Roadmap','Priority Q&A'], false, 31, true, 90, 'ascent', 'quarterly', 6747, null),
  ('plan_ascent_yearly', 'Ascent Yearly', 14399, '12 months', ARRAY['Unlimited Mains Evaluations & Mock Tests','Jeet AI - unlimited messages','Weekly 1-on-1 mentorship','Personalised Study Roadmap','Priority Q&A'], false, 32, true, 365, 'ascent', 'yearly', 29988, null)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "price" = EXCLUDED."price",
  "duration" = EXCLUDED."duration",
  "features" = EXCLUDED."features",
  "is_popular" = EXCLUDED."is_popular",
  "order" = EXCLUDED."order",
  "is_active" = EXCLUDED."is_active",
  "duration_days" = EXCLUDED."duration_days",
  "tier" = EXCLUDED."tier",
  "billing_cycle" = EXCLUDED."billing_cycle",
  "original_price" = EXCLUDED."original_price",
  "entitlements" = EXCLUDED."entitlements";

COMMIT;
