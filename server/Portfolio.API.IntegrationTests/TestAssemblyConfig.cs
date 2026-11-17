// Every test host migrates the same test database and seeds, and on disposal deletes, the same shared test users.
// Run in parallel, one host finishing early removes the users another is just signing in as. The tests are
// quick, so they run one class at a time.
[assembly: CollectionBehavior(DisableTestParallelization = true)]
