insert into users (uid,pwd,created,owner,cell,email,mtypes) values (14fb0860-b4bf-11e9-8971-7b80435315ac,'W6ph5Mm5Pz8GgiULbPgzG37mj9g=',toTimestamp(now()),14fb0860-b4bf-11e9-8971-7b80435315ac,'+16503907496','dioptre@gmail.com', []);
update users set mdevices= [
    { mtype: 'apn', did: 'b41f4c05619a546a52f496f6da25c719ca019bcaff69ed204e72ba173853c1fd', updated: toTimestamp(now()) }
    , { mtype: 'fcm', did: 'e_nslPZejyM:APA91bHR-znf4EuSIKeY9dzlX4cupXA5cdsW1SzOHUFRrsteaL5WDuzsh_cnpVpQC3IPcewl_v3N0kbArC67UTEW_ENt5Ej5Sn0qi1RoRHv5beLNi9y4OzZ__T3SH3tW5gwqxn2Hap01', updated: toTimestamp(now()) }
] where uid=14fb0860-b4bf-11e9-8971-7b80435315ac;

insert into mthreads ( 
    tid, 
    alias, 
    name,
    mtypes,
    prefs,
    owner,
    opens,
    admins,
    subs,
    pubs,
    sys
) values (
    5ae3c890-5e55-11ea-9283-4fa18a847130, 
    'native:dailypulse', 
    'Daily Pulse',
    {'fcm', 'apn', 'ws', 'sms', 'wpn', 'em'},
    {14fb0860-b4bf-11e9-8971-7b80435315ac : {'em'}},
    14fb0860-b4bf-11e9-8971-7b80435315ac,
    true,
    {14fb0860-b4bf-11e9-8971-7b80435315ac,00000000-0000-0000-0000-000000000000},
    {14fb0860-b4bf-11e9-8971-7b80435315ac,00000000-0000-0000-0000-000000000000},
    {14fb0860-b4bf-11e9-8971-7b80435315ac,00000000-0000-0000-0000-000000000000},
    true
);

