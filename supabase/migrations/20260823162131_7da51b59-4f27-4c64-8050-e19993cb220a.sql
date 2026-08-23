UPDATE public.marketplace_offers mo
SET title = COALESCE(NULLIF(po.offer_description, ''), mo.merchant_name),
    description = NULL,
    terms = CASE WHEN NULLIF(po.discount,'') IS NOT NULL
                 THEN 'Sample listing. Advertised saving: ' || po.discount || '.'
                 ELSE 'Sample listing.' END
FROM public.partner_offers po
WHERE mo.source = 'demo' AND mo.source_offer_id = po.id::text;