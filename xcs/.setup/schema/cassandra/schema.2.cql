-- To run:
-- cqlsh --ssl -f schema.1.cql 
-- Licensed under Apache-2.0.  Copyright (c) 2018 SF Product Labs. All Rights Reserved.
-- See LICENSE

use sfpl;

--Describe the splits
create table splits (
  cohort text, --Ex. males, * = special case, all users by default
  family text, --Split family (we can have multiple representations of the same cohort), this is a grouping element only and in a lot of instances cohort=family. Ex. (for cohort->family), Males->males or Males->males2020 or another better example might be *->AB
  split text, --Ex. A
  seq int, --Ex. 1 for first split
  users set<timeuuid>, --set of users in this split
  pct double, --**CANNOT** have both users and pct (percent)! Percents in a family must equal 100. Ex. for A/B, 50.0
  created timestamp,
  org timeuuid,
  owner timeuuid,
  updated timestamp,
  updater timeuuid,
  PRIMARY KEY (split) --split must be unique and could actually look like (cohort,family,split) but we want split to be unique across all cohorts
);