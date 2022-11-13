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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Controllers -----------------------------------

const buildSetFields = (fields) => fields.reduce((setSQL, field, index) =>
  setSQL + `${field}=:${field}` + ((index === fields.length - 1) ? '' : ', '), 'SET ');


const buildModulesInsertSql = (record) => {
  let table = 'Modules';
  let mutableFields = ['ModuleName', 'ModuleCode', 'ModuleLevel', 'ModuleYearID', 'ModuleLeaderID', 'ModuleImageURL'];
  return `INSERT INTO ${table} ` + buildSetFields(mutableFields);
};

const buildModulesSelectSql = (id, variant) => {
  let table = '((Modules LEFT JOIN Users ON ModuleLeaderID=UserID) LEFT JOIN Years ON ModuleYearID=YearID )';
  let fields = ['ModuleID', 'ModuleName', 'ModuleCode', 'ModuleLevel', 'ModuleYearID', 'ModuleLeaderID', 'ModuleImageURL', 'CONCAT(UserFirstname," ",UserLastname) AS ModuleLeaderName', 'YearName AS ModuleYearName'];
  let sql = '';

  switch (variant) {
    case 'leader':
      sql = `SELECT ${fields} FROM ${table} WHERE ModuleLeaderID=${id}`;
      break;
    case 'users':
      table = `Modulemembers INNER JOIN ${table} ON Modulemembers.ModulememberModuleID=Modules.ModuleID`;
      sql = `SELECT ${fields} FROM ${table} WHERE ModulememberUserID=${id}`;
      break;
    default:
      sql = `SELECT ${fields} FROM ${table}`;
      if (id) sql += ` WHERE ModuleID=${id}`;
  }

  return sql;
};

const buildUsersSelectSql = (id, variant) => {
  let table = '((Users LEFT JOIN Usertypes ON UserUsertypeID=UsertypeID) LEFT JOIN Years ON UserYearID=YearID )';
  let fields = ['UserID', 'UserFirstname', 'UserLastname', 'UserEmail', 'UserLevel', 'UserYearID', 'UserUsertypeID', 'UserImageURL', 'UsertypeName AS UserUsertypeName', 'YearName AS UserYearName'];
  let sql = '';

  const STAFF = 1; // Primary key for staff type in Unibase Usertypes table
  const STUDENT = 2; // Primary key for student type in Unibase Usertypes table

  switch (variant) {
    case 'student':
      sql = `SELECT ${fields} FROM ${table} WHERE UserUsertypeID=${STUDENT}`;
      break;
    case 'staff':
      sql = `SELECT ${fields} FROM ${table} WHERE UserUsertypeID=${STAFF}`;
      break;
    case 'groups':
      table = `Groupmembers INNER JOIN ${table} ON Groupmembers.GroupmemberUserID=Users.UserID`;
      sql = `SELECT ${fields} FROM ${table} WHERE GroupmemberGroupID=${id}`;
      break;
    default:
      sql = `SELECT ${fields} FROM ${table}`;
      if (id) sql += ` WHERE UserID=${id}`;
  }
  
  return sql;
};

const buildYearsSelectSql = (id, variant) => {
  let table = 'Years';
  let fields = ['YearID', 'YearName'];
  let sql = '';

  switch (variant) {
    default:
      sql = `SELECT ${fields} FROM ${table}`;
      if (id) sql += ` WHERE ModuleID=${id}`;
  }

  return sql;
};

const create = async (sql,record) => {
  try {
    const status = await database.query(sql,record);

    const recoverRecordSql = buildModulesSelectSql(status[0].insertId, null);

    const { isSuccess, result, message } = await read(recoverRecordSql);
        
    return isSuccess
      ? { isSuccess: true, result: result, message: 'Record successfully recovered' }
      : { isSuccess: false, result: null, message: `Failed to recover the inserted record: ${message}` };
  }
  catch (error) {
    return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
  }
};

const read = async (sql) => {
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

const getModulesController = async (res, id, variant) => {
  // Validate request

  // Access data
  const sql = buildModulesSelectSql(id, variant);
  const { isSuccess, result, message: accessorMessage } = await read(sql);
  if (!isSuccess) return res.status(404).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

const postModulesController = async (req, res) => {
  // Validate request

  // Access data
  const sql = buildModulesInsertSql(req.body);
  const { isSuccess, result, message: accessorMessage } = await create(sql,req.body);
  if (!isSuccess) return res.status(400).json({ message: accessorMessage });
  
  // Response to request
  res.status(201).json(result);
};

const getUsersController = async (res, id, variant) => {
  // Validate request

  // Access data
  const sql = buildUsersSelectSql(id, variant);
  const { isSuccess, result, message: accessorMessage } = await read(sql);
  if (!isSuccess) return res.status(404).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

const getYearsController = async (res, id, variant) => {
  // Validate request

  // Access data
  const sql = buildYearsSelectSql(id, variant);
  const { isSuccess, result, message: accessorMessage } = await read(sql);
  if (!isSuccess) return res.status(404).json({ message: accessorMessage });
  
  // Response to request
  res.status(200).json(result);
};

// Endpoints -------------------------------------
// Modules
app.get('/api/modules', (req, res) => getModulesController(res, null, null));
app.get('/api/modules/:id(\\d+)', (req, res) => getModulesController(res, req.params.id, null));
app.get('/api/modules/leader/:id', (req, res) => getModulesController(res, req.params.id, 'leader'));
app.get('/api/modules/users/:id', (req, res) => getModulesController(res, req.params.id, 'users'));

app.post('/api/modules', postModulesController);

// Users
app.get('/api/users', (req, res) => getUsersController(res, null, null));
app.get('/api/users/:id(\\d+)', (req, res) => getUsersController(res, req.params.id, null));
app.get('/api/users/student', (req, res) => getUsersController(res, null, 'student'));
app.get('/api/users/staff', (req, res) => getUsersController(res, null, 'staff'));
app.get('/api/users/groups/:id', (req, res) => getUsersController(res, req.params.id, 'groups'));

// Years
app.get('/api/years', (req, res) => getYearsController(res, null, null));
app.get('/api/years/:id', (req, res) => getYearsController(res, req.params.id, null));

// Start server ----------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT,() => console.log(`Server started on port ${PORT}`));
