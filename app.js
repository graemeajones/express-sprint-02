// Imports ---------------------------------------
import express from 'express';
import cors from 'cors';
import database from './database.js';

// Configure express app -------------------------
const app = new express();

// Configure middleware --------------------------
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(cors({ origin: '*' }));

// Controllers -----------------------------------

const buildModulesSelectSql = (whereField, id, isUsersExtended) => {
  let table = '((Modules LEFT JOIN Users ON ModuleLeaderID=UserID) LEFT JOIN Years ON ModuleYearID=YearID )';
  let fields = ['ModuleID', 'ModuleName', 'ModuleCode', 'ModuleLevel', 'ModuleYearID', 'ModuleLeaderID', 'ModuleImageURL', 'CONCAT(UserFirstname," ",UserLastname) AS ModuleLeaderName', 'YearName AS ModuleYearName'];
  if (isUsersExtended) {
    table = `Modulemembers INNER JOIN ${table} ON Modulemembers.ModulememberModuleID=Modules.ModuleID`;
  }
  let sql = `SELECT ${fields} FROM ${table}`;
  if (id) sql += ` WHERE ${whereField}=${id}`;
  
  return sql;
};

const readModules = async (whereField, id, isUsersExtended) => {
  const sql = buildModulesSelectSql(whereField, id, isUsersExtended);
  try {
    const [result] = await database.query(sql);
    return (result.length === 0)
      ? { isSuccess: false, result: null, message: 'No record(s) found' }
      : { isSuccess: true, result: result, message: 'Record(s) successfully recovered' };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

const modulesController = async (res, whereField, id, isUsersExtended) => {
  // Validate request

  // Access data
  const { isSuccess, result, message: accessorMessage } = await readModules(whereField, id, isUsersExtended);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

const buildUsersSelectSql = (whereField, id, isGroupsExtended) => {
  let table = '((Users LEFT JOIN Usertypes ON UserUsertypeID=UsertypeID) LEFT JOIN Years ON UserYearID=YearID )';
  let fields = ['UserID', 'UserFirstname', 'UserLastname', 'UserEmail', 'UserLevel', 'UserYearID', 'UserUsertypeID', 'UserImageURL', 'UsertypeName AS UserUsertypeName', 'YearName AS UserYearName'];
  if (isGroupsExtended) {
    table = `Groupmembers INNER JOIN ${table} ON Groupmembers.GroupmemberUserID=Users.UserID`;
  }
  let sql = `SELECT ${fields} FROM ${table}`;
  if (id) sql += ` WHERE ${whereField}=${id}`;

  return sql;
};

const readUsers = async (whereField, id, isGroupsExtended) => {
  const sql = buildUsersSelectSql(whereField, id, isGroupsExtended);
  try {
    const [result] = await database.query(sql);
    return (result.length === 0)
      ? { isSuccess: false, result: null, message: 'No record(s) found' }
      : { isSuccess: true, result: result, message: 'Record(s) successfully recovered' };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

const usersController = async (res, whereField, id, isGroupsExtended) => {
  // Validate request

  // Access data
  const { isSuccess, result, message: accessorMessage } = await readUsers(whereField, id, isGroupsExtended);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

// Endpoints -------------------------------------
// Modules
app.get('/api/modules', (req, res) => modulesController(res, null, null, false));
app.get('/api/modules/:id(\d+)', (req, res) => modulesController(res, "ModuleID", req.params.id, false));
app.get('/api/modules/leader/:id', (req, res) => modulesController(res, "ModuleLeaderID", req.params.id, false));
app.get('/api/modules/users/:id', (req, res) => modulesController(res, "ModulememberUserID", req.params.id, true));

// Users
const STAFF = 1;
const STUDENT = 2;
app.get('/api/users', (req, res) => usersController(res, null, null, false));
app.get('/api/users/:id(\d+)', (req, res) => usersController(res, "UserID", req.params.id, false));
app.get('/api/users/student', (req, res) => usersController(res, "UsertypeID", STUDENT, false));
app.get('/api/users/staff', (req, res) => usersController(res, "UsertypeID", STAFF, false));
app.get('/api/users/groups/:id', (req, res) => usersController(res, "GroupmemberGroupID", req.params.id, true));

// Start server ----------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT,() => console.log(`Server started on port ${PORT}`));
