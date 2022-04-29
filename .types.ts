export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

export type Class = {
  __typename?: 'Class';
  id?: Maybe<Scalars['ID']>;
  name?: Maybe<Scalars['String']>;
  students?: Maybe<Array<Maybe<Student>>>;
  /** @deprecated Field no longer supported */
  teacher?: Maybe<Professor>;
};

export type Professor = {
  __typename?: 'Professor';
  examinerOf?: Maybe<Student>;
  firstName?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  lastName?: Maybe<Scalars['String']>;
  students?: Maybe<Array<Maybe<Student>>>;
  teaches?: Maybe<Array<Maybe<Class>>>;
};

export type Query = {
  __typename?: 'Query';
  getClasses?: Maybe<Array<Class>>;
  getProfessors?: Maybe<Array<Professor>>;
  getStudents?: Maybe<Array<Student>>;
};

export type Student = {
  __typename?: 'Student';
  classes?: Maybe<Array<Maybe<Class>>>;
  firstName?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  lastName?: Maybe<Scalars['String']>;
  professors?: Maybe<Array<Maybe<Professor>>>;
};
