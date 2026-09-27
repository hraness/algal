// Lean compiler output
// Module: Algal.Memory.Datalog
// Imports: public import Init public meta import Init
#include <lean/lean.h>
#if defined(__clang__)
#pragma clang diagnostic ignored "-Wunused-parameter"
#pragma clang diagnostic ignored "-Wunused-label"
#elif defined(__GNUC__) && !defined(__CLANG__)
#pragma GCC diagnostic ignored "-Wunused-parameter"
#pragma GCC diagnostic ignored "-Wunused-label"
#pragma GCC diagnostic ignored "-Wunused-but-set-variable"
#endif
#ifdef __cplusplus
extern "C" {
#endif
lean_object* l_Repr_addAppParen(lean_object*, lean_object*);
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
lean_object* lean_nat_to_int(lean_object*);
lean_object* l_Bool_repr___redArg(uint8_t);
uint8_t lean_int_dec_lt(lean_object*, lean_object*);
lean_object* l_Int_repr(lean_object*);
lean_object* l_String_quote(lean_object*);
uint8_t lean_int_dec_eq(lean_object*, lean_object*);
uint8_t lean_string_dec_eq(lean_object*, lean_object*);
lean_object* lean_mk_empty_array_with_capacity(lean_object*);
lean_object* lean_array_to_list(lean_object*);
lean_object* l_List_foldl___at___00Array_appendList_spec__0___redArg(lean_object*, lean_object*);
uint8_t l_instDecidableEqList___redArg(lean_object*, lean_object*, lean_object*);
lean_object* l_instBEqOfDecidableEq___redArg___lam__0___boxed(lean_object*, lean_object*, lean_object*);
uint8_t l_List_elem___redArg(lean_object*, lean_object*, lean_object*);
lean_object* l_List_appendTR___redArg(lean_object*, lean_object*);
uint8_t l_List_instDecidableEqNil___redArg(lean_object*);
lean_object* l_List_reverse___redArg(lean_object*);
uint8_t lean_nat_dec_lt(lean_object*, lean_object*);
lean_object* l_List_get_x3fInternal___redArg(lean_object*, lean_object*);
uint8_t l_Option_instDecidableEq___redArg(lean_object*, lean_object*, lean_object*);
lean_object* lean_nat_add(lean_object*, lean_object*);
lean_object* lean_string_length(lean_object*);
lean_object* l_instDecidableEqString___boxed(lean_object*, lean_object*);
lean_object* lean_array_push(lean_object*, lean_object*);
lean_object* l_List_lengthTR___redArg(lean_object*);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
lean_object* lean_nat_sub(lean_object*, lean_object*);
lean_object* l_List_repr_x27___at___00Lean_Syntax_instReprPreresolved_repr_spec__0___redArg(lean_object*);
lean_object* l_List_mapTR_loop___redArg(lean_object*, lean_object*, lean_object*);
lean_object* l___private_Init_Data_List_Impl_0__List_flatMapTR_go___redArg(lean_object*, lean_object*, lean_object*);
uint8_t l_instDecidableEqProd___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
lean_object* l_instDecidableEqNat___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_ctorIdx(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_ctorElim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_null_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_null_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_bool_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_bool_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_int_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_int_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_text_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_text_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqAtom_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqAtom_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqAtom(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqAtom___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 23, .m_capacity = 23, .m_length = 22, .m_data = "Algal.Memory.Atom.null"};
static const lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__1_value;
static lean_once_cell_t lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2;
static lean_once_cell_t lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3;
static const lean_string_object lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 23, .m_capacity = 23, .m_length = 22, .m_data = "Algal.Memory.Atom.bool"};
static const lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__5_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__5_value),((lean_object*)(((size_t)(1) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__6_value;
static const lean_string_object lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 22, .m_capacity = 22, .m_length = 21, .m_data = "Algal.Memory.Atom.int"};
static const lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__7_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__7_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__8_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__8_value),((lean_object*)(((size_t)(1) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__9_value;
static lean_once_cell_t lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__10_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__10;
static const lean_string_object lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__11_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 23, .m_capacity = 23, .m_length = 22, .m_data = "Algal.Memory.Atom.text"};
static const lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__11 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__11_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__12_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__11_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__12 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__12_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__13_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__12_value),((lean_object*)(((size_t)(1) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__13 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__13_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Memory_instReprAtom___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Memory_instReprAtom_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Memory_instReprAtom___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Memory_instReprAtom = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprAtom___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_ctorIdx(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_ctorElim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_atom_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_atom_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_var_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_var_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqTerm_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqTerm_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqTerm(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqTerm___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 23, .m_capacity = 23, .m_length = 22, .m_data = "Algal.Memory.Term.atom"};
static const lean_object* lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__1_value),((lean_object*)(((size_t)(1) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__2_value;
static const lean_string_object lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 22, .m_capacity = 22, .m_length = 21, .m_data = "Algal.Memory.Term.var"};
static const lean_object* lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__3_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__3_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__4_value),((lean_object*)(((size_t)(1) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__5_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprTerm_repr(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprTerm_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Memory_instReprTerm___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Memory_instReprTerm_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Memory_instReprTerm___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprTerm___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Memory_instReprTerm = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprTerm___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_atomOf(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqLiteral_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqLiteral_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqLiteral(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqLiteral___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0_spec__0___lam__0(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0_spec__0_spec__1_spec__2(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0_spec__0_spec__1(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0_spec__0(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "[]"};
static const lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__0 = (const lean_object*)&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__0_value;
static const lean_ctor_object lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__0_value)}};
static const lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__1 = (const lean_object*)&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__1_value;
static const lean_string_object lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 2, .m_capacity = 2, .m_length = 1, .m_data = "["};
static const lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__2 = (const lean_object*)&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__2_value;
static const lean_string_object lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 2, .m_capacity = 2, .m_length = 1, .m_data = ","};
static const lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__3 = (const lean_object*)&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__3_value;
static const lean_ctor_object lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__3_value)}};
static const lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__4 = (const lean_object*)&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__4_value;
static const lean_ctor_object lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__4_value),((lean_object*)(((size_t)(1) << 1) | 1))}};
static const lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__5 = (const lean_object*)&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__5_value;
static const lean_string_object lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 2, .m_capacity = 2, .m_length = 1, .m_data = "]"};
static const lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__6 = (const lean_object*)&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__6_value;
static lean_once_cell_t lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__7_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__7;
static lean_once_cell_t lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__8_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__8;
static const lean_ctor_object lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__2_value)}};
static const lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__9 = (const lean_object*)&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__9_value;
static const lean_ctor_object lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__10_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__6_value)}};
static const lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__10 = (const lean_object*)&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__10_value;
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg(lean_object*);
static const lean_string_object lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "{ "};
static const lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 9, .m_capacity = 9, .m_length = 8, .m_data = "relation"};
static const lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__1_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = " := "};
static const lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__5_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__3_value),((lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__5_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__6_value;
static lean_once_cell_t lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__7_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__7;
static const lean_string_object lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "terms"};
static const lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__8_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__8_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__9_value;
static lean_once_cell_t lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__10_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__10;
static const lean_string_object lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__11_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = " }"};
static const lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__11 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__11_value;
static lean_once_cell_t lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__12_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__12;
static lean_once_cell_t lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__13_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__13;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__14_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__14 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__14_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__15_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__11_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__15 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__15_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Memory_instReprLiteral___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Memory_instReprLiteral_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Memory_instReprLiteral___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Memory_instReprLiteral = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqTuple_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqTuple_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqTuple(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqTuple___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0_spec__0___lam__0(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0_spec__0_spec__1_spec__2(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0_spec__0_spec__1(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0___redArg(lean_object*);
static const lean_string_object lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "args"};
static const lean_object* lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg___closed__1_value;
static lean_once_cell_t lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg___closed__2_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg___closed__2;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprTuple_repr(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprTuple_repr___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Memory_instReprTuple___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Memory_instReprTuple_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Memory_instReprTuple___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprTuple___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Memory_instReprTuple = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprTuple___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqFact_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqFact_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqFact(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqFact___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "tuple"};
static const lean_object* lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)&lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__1_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__2_value),((lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__5_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 8, .m_capacity = 8, .m_length = 7, .m_data = "sources"};
static const lean_object* lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__5_value;
static lean_once_cell_t lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__6_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__6;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprFact_repr___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprFact_repr(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprFact_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Memory_instReprFact___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Memory_instReprFact_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Memory_instReprFact___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprFact___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Memory_instReprFact = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprFact___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_Fact_lit_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Fact_lit(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqRule_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqRule_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqRule(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqRule___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprRule_repr_spec__0_spec__0_spec__1_spec__2(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprRule_repr_spec__0_spec__0_spec__1(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprRule_repr_spec__0_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprRule_repr_spec__0___redArg(lean_object*);
static const lean_string_object lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "id"};
static const lean_object* lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)&lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__1_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__2_value),((lean_object*)&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__5_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__3_value;
static lean_once_cell_t lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__4_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__4;
static const lean_string_object lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "head"};
static const lean_object* lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__5_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__5_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__6_value;
static const lean_string_object lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "body"};
static const lean_object* lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__7_value;
static const lean_ctor_object lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__7_value)}};
static const lean_object* lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__8_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprRule_repr___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprRule_repr(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprRule_repr___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprRule_repr_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprRule_repr_spec__0___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Memory_instReprRule___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Memory_instReprRule_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Memory_instReprRule___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprRule___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Memory_instReprRule = (const lean_object*)&lp_algalVerification_Algal_Memory_instReprRule___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_lookup(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_lookup___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_lookup_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_lookup_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instTerm(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instTerm___boxed(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Memory_mapOpt___redArg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Memory_mapOpt___redArg___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_mapOpt___redArg___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_mapOpt___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_mapOpt(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_mapOpt_match__5_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_mapOpt_match__5_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_mapOpt_match__3_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_mapOpt_match__3_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_mapOpt_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_mapOpt_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instArgs(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instLit(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_instLit_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_instLit_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_termVars(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_termVars___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_litVars_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_litVars_spec__0___boxed(lean_object*, lean_object*);
static const lean_array_object lp_algalVerification_Algal_Memory_litVars___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_array_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 246}, .m_size = 0, .m_capacity = 0, .m_data = {}};
static const lean_object* lp_algalVerification_Algal_Memory_litVars___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_litVars___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_litVars(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_litVars___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_bodyVars_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_bodyVars_spec__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_bodyVars(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_bodyVars___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_instReprTerm_repr_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_instReprTerm_repr_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_matchTerm(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_matchTerm_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_matchTerm_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_matchArgs(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_matchArgs_match__3_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_matchArgs_match__3_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_matchArgs_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_matchArgs_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_matchLit(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_filterMapTR_go___at___00Algal_Memory_joinLit_spec__0(lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_array_object lp_algalVerification_Algal_Memory_joinLit___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_array_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 246}, .m_size = 0, .m_capacity = 0, .m_data = {}};
static const lean_object* lp_algalVerification_Algal_Memory_joinLit___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_joinLit___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_joinLit(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_joinBody(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_joinBody_spec__0(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_joinBody_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_joinBody_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_filterMapTR_go___at___00Algal_Memory_fire_spec__0(lean_object*, lean_object*, lean_object*);
static const lean_array_object lp_algalVerification_Algal_Memory_fire___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_array_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 246}, .m_size = 0, .m_capacity = 0, .m_data = {}};
static const lean_object* lp_algalVerification_Algal_Memory_fire___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_fire___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_fire(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_insertAll___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_insertAll(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_eraseFirst___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_eraseFirst(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_seed_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_seed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_round_spec__0(lean_object*, lean_object*, lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Memory_insertAll___at___00Algal_Memory_round_spec__1___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Memory_insertAll___at___00Algal_Memory_round_spec__1___closed__0;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_insertAll___at___00Algal_Memory_round_spec__1(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_round(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_iter(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_iter___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_iter_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_iter_match__1_splitter___redArg___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_iter_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_iter_match__1_splitter___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_literals_spec__1(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_literals_spec__0(lean_object*, lean_object*);
static const lean_array_object lp_algalVerification_Algal_Memory_literals___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_array_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 246}, .m_size = 0, .m_capacity = 0, .m_data = {}};
static const lean_object* lp_algalVerification_Algal_Memory_literals___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_literals___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_literals(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_filterMapTR_go___at___00Algal_Memory_litAtoms_spec__0(lean_object*, lean_object*);
static const lean_array_object lp_algalVerification_Algal_Memory_litAtoms___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_array_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 246}, .m_size = 0, .m_capacity = 0, .m_data = {}};
static const lean_object* lp_algalVerification_Algal_Memory_litAtoms___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_litAtoms___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_litAtoms(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_domain_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_domain(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList___redArg___lam__0(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Memory_powList___redArg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Memory_powList___redArg___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_powList___redArg___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList___redArg___lam__1___boxed(lean_object*, lean_object*, lean_object*);
static const lean_array_object lp_algalVerification_Algal_Memory_powList___redArg___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_array_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 246}, .m_size = 0, .m_capacity = 0, .m_data = {}};
static const lean_object* lp_algalVerification_Algal_Memory_powList___redArg___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Memory_powList___redArg___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList___redArg___lam__1(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList___redArg___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_univ_spec__1(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_univ_spec__1___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_powList___at___00Algal_Memory_univ_spec__0_spec__0(lean_object*, lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Memory_powList___at___00Algal_Memory_univ_spec__0___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Memory_powList___at___00Algal_Memory_univ_spec__0___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_powList___at___00Algal_Memory_univ_spec__0___closed__0_value;
static const lean_array_object lp_algalVerification_Algal_Memory_powList___at___00Algal_Memory_univ_spec__0___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_array_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 246}, .m_size = 0, .m_capacity = 0, .m_data = {}};
static const lean_object* lp_algalVerification_Algal_Memory_powList___at___00Algal_Memory_univ_spec__0___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Memory_powList___at___00Algal_Memory_univ_spec__0___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList___at___00Algal_Memory_univ_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_powList___at___00Algal_Memory_univ_spec__0_spec__1(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_powList___at___00Algal_Memory_univ_spec__0_spec__1___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList___at___00Algal_Memory_univ_spec__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_univ_spec__2(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_univ_spec__2___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_univ(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_reach(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_derivable__decidable___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_derivable__decidable___redArg___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_derivable__decidable(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_derivable__decidable___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__1(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__1___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__2(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__2___boxed(lean_object*, lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__0___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___closed__0_value;
static const lean_closure_object lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*1, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__1___boxed, .m_arity = 3, .m_num_fixed = 1, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___closed__0_value)} };
static const lean_object* lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___closed__1_value;
static const lean_closure_object lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*1, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__2___boxed, .m_arity = 3, .m_num_fixed = 1, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___closed__1_value)} };
static const lean_object* lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___closed__2_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqDerivNode(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqDerivNode___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_premisesOK(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_premisesOK___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Memory_nodeValid___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Memory_nodeValid___closed__0;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_nodeValid(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_nodeValid___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_validFrom(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_validFrom___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_valid(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_valid___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_validFrom_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_validFrom_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_premisesOK_match__3_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_premisesOK_match__3_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_premisesOK_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_premisesOK_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_ctorIdx(lean_object* v_x_1_){
_start:
{
switch(lean_obj_tag(v_x_1_))
{
case 0:
{
lean_object* v___x_2_; 
v___x_2_ = lean_unsigned_to_nat(0u);
return v___x_2_;
}
case 1:
{
lean_object* v___x_3_; 
v___x_3_ = lean_unsigned_to_nat(1u);
return v___x_3_;
}
case 2:
{
lean_object* v___x_4_; 
v___x_4_ = lean_unsigned_to_nat(2u);
return v___x_4_;
}
default: 
{
lean_object* v___x_5_; 
v___x_5_ = lean_unsigned_to_nat(3u);
return v___x_5_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_ctorIdx___boxed(lean_object* v_x_6_){
_start:
{
lean_object* v_res_7_; 
v_res_7_ = lp_algalVerification_Algal_Memory_Atom_ctorIdx(v_x_6_);
lean_dec(v_x_6_);
return v_res_7_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_ctorElim___redArg(lean_object* v_t_8_, lean_object* v_k_9_){
_start:
{
switch(lean_obj_tag(v_t_8_))
{
case 0:
{
return v_k_9_;
}
case 1:
{
uint8_t v_a_10_; lean_object* v___x_11_; lean_object* v___x_12_; 
v_a_10_ = lean_ctor_get_uint8(v_t_8_, 0);
lean_dec_ref_known(v_t_8_, 0);
v___x_11_ = lean_box(v_a_10_);
v___x_12_ = lean_apply_1(v_k_9_, v___x_11_);
return v___x_12_;
}
case 2:
{
lean_object* v_a_13_; lean_object* v___x_14_; 
v_a_13_ = lean_ctor_get(v_t_8_, 0);
lean_inc(v_a_13_);
lean_dec_ref_known(v_t_8_, 1);
v___x_14_ = lean_apply_1(v_k_9_, v_a_13_);
return v___x_14_;
}
default: 
{
lean_object* v_a_15_; lean_object* v___x_16_; 
v_a_15_ = lean_ctor_get(v_t_8_, 0);
lean_inc_ref(v_a_15_);
lean_dec_ref_known(v_t_8_, 1);
v___x_16_ = lean_apply_1(v_k_9_, v_a_15_);
return v___x_16_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_ctorElim(lean_object* v_motive_17_, lean_object* v_ctorIdx_18_, lean_object* v_t_19_, lean_object* v_h_20_, lean_object* v_k_21_){
_start:
{
lean_object* v___x_22_; 
v___x_22_ = lp_algalVerification_Algal_Memory_Atom_ctorElim___redArg(v_t_19_, v_k_21_);
return v___x_22_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_ctorElim___boxed(lean_object* v_motive_23_, lean_object* v_ctorIdx_24_, lean_object* v_t_25_, lean_object* v_h_26_, lean_object* v_k_27_){
_start:
{
lean_object* v_res_28_; 
v_res_28_ = lp_algalVerification_Algal_Memory_Atom_ctorElim(v_motive_23_, v_ctorIdx_24_, v_t_25_, v_h_26_, v_k_27_);
lean_dec(v_ctorIdx_24_);
return v_res_28_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_null_elim___redArg(lean_object* v_t_29_, lean_object* v_null_30_){
_start:
{
lean_object* v___x_31_; 
v___x_31_ = lp_algalVerification_Algal_Memory_Atom_ctorElim___redArg(v_t_29_, v_null_30_);
return v___x_31_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_null_elim(lean_object* v_motive_32_, lean_object* v_t_33_, lean_object* v_h_34_, lean_object* v_null_35_){
_start:
{
lean_object* v___x_36_; 
v___x_36_ = lp_algalVerification_Algal_Memory_Atom_ctorElim___redArg(v_t_33_, v_null_35_);
return v___x_36_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_bool_elim___redArg(lean_object* v_t_37_, lean_object* v_bool_38_){
_start:
{
lean_object* v___x_39_; 
v___x_39_ = lp_algalVerification_Algal_Memory_Atom_ctorElim___redArg(v_t_37_, v_bool_38_);
return v___x_39_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_bool_elim(lean_object* v_motive_40_, lean_object* v_t_41_, lean_object* v_h_42_, lean_object* v_bool_43_){
_start:
{
lean_object* v___x_44_; 
v___x_44_ = lp_algalVerification_Algal_Memory_Atom_ctorElim___redArg(v_t_41_, v_bool_43_);
return v___x_44_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_int_elim___redArg(lean_object* v_t_45_, lean_object* v_int_46_){
_start:
{
lean_object* v___x_47_; 
v___x_47_ = lp_algalVerification_Algal_Memory_Atom_ctorElim___redArg(v_t_45_, v_int_46_);
return v___x_47_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_int_elim(lean_object* v_motive_48_, lean_object* v_t_49_, lean_object* v_h_50_, lean_object* v_int_51_){
_start:
{
lean_object* v___x_52_; 
v___x_52_ = lp_algalVerification_Algal_Memory_Atom_ctorElim___redArg(v_t_49_, v_int_51_);
return v___x_52_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_text_elim___redArg(lean_object* v_t_53_, lean_object* v_text_54_){
_start:
{
lean_object* v___x_55_; 
v___x_55_ = lp_algalVerification_Algal_Memory_Atom_ctorElim___redArg(v_t_53_, v_text_54_);
return v___x_55_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Atom_text_elim(lean_object* v_motive_56_, lean_object* v_t_57_, lean_object* v_h_58_, lean_object* v_text_59_){
_start:
{
lean_object* v___x_60_; 
v___x_60_ = lp_algalVerification_Algal_Memory_Atom_ctorElim___redArg(v_t_57_, v_text_59_);
return v___x_60_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqAtom_decEq(lean_object* v_x_61_, lean_object* v_x_62_){
_start:
{
switch(lean_obj_tag(v_x_61_))
{
case 0:
{
if (lean_obj_tag(v_x_62_) == 0)
{
uint8_t v___x_63_; 
v___x_63_ = 1;
return v___x_63_;
}
else
{
uint8_t v___x_64_; 
v___x_64_ = 0;
return v___x_64_;
}
}
case 1:
{
uint8_t v_a_65_; uint8_t v___x_66_; 
v_a_65_ = lean_ctor_get_uint8(v_x_61_, 0);
v___x_66_ = 0;
switch(lean_obj_tag(v_x_62_))
{
case 0:
{
return v___x_66_;
}
case 1:
{
if (v_a_65_ == 0)
{
uint8_t v_a_67_; 
v_a_67_ = lean_ctor_get_uint8(v_x_62_, 0);
if (v_a_67_ == 0)
{
uint8_t v___x_68_; 
v___x_68_ = 1;
return v___x_68_;
}
else
{
return v___x_66_;
}
}
else
{
uint8_t v_a_69_; 
v_a_69_ = lean_ctor_get_uint8(v_x_62_, 0);
if (v_a_69_ == 0)
{
return v___x_66_;
}
else
{
return v_a_69_;
}
}
}
default: 
{
return v___x_66_;
}
}
}
case 2:
{
lean_object* v_a_70_; uint8_t v___x_71_; 
v_a_70_ = lean_ctor_get(v_x_61_, 0);
v___x_71_ = 0;
switch(lean_obj_tag(v_x_62_))
{
case 0:
{
return v___x_71_;
}
case 2:
{
lean_object* v_a_72_; uint8_t v___x_73_; 
v_a_72_ = lean_ctor_get(v_x_62_, 0);
v___x_73_ = lean_int_dec_eq(v_a_70_, v_a_72_);
if (v___x_73_ == 0)
{
return v___x_71_;
}
else
{
return v___x_73_;
}
}
default: 
{
return v___x_71_;
}
}
}
default: 
{
lean_object* v_a_74_; uint8_t v___x_75_; 
v_a_74_ = lean_ctor_get(v_x_61_, 0);
v___x_75_ = 0;
switch(lean_obj_tag(v_x_62_))
{
case 0:
{
return v___x_75_;
}
case 3:
{
lean_object* v_a_76_; uint8_t v___x_77_; 
v_a_76_ = lean_ctor_get(v_x_62_, 0);
v___x_77_ = lean_string_dec_eq(v_a_74_, v_a_76_);
if (v___x_77_ == 0)
{
return v___x_75_;
}
else
{
return v___x_77_;
}
}
default: 
{
return v___x_75_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqAtom_decEq___boxed(lean_object* v_x_78_, lean_object* v_x_79_){
_start:
{
uint8_t v_res_80_; lean_object* v_r_81_; 
v_res_80_ = lp_algalVerification_Algal_Memory_instDecidableEqAtom_decEq(v_x_78_, v_x_79_);
lean_dec(v_x_79_);
lean_dec(v_x_78_);
v_r_81_ = lean_box(v_res_80_);
return v_r_81_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqAtom(lean_object* v_x_82_, lean_object* v_x_83_){
_start:
{
uint8_t v___x_84_; 
v___x_84_ = lp_algalVerification_Algal_Memory_instDecidableEqAtom_decEq(v_x_82_, v_x_83_);
return v___x_84_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqAtom___boxed(lean_object* v_x_85_, lean_object* v_x_86_){
_start:
{
uint8_t v_res_87_; lean_object* v_r_88_; 
v_res_87_ = lp_algalVerification_Algal_Memory_instDecidableEqAtom(v_x_85_, v_x_86_);
lean_dec(v_x_86_);
lean_dec(v_x_85_);
v_r_88_ = lean_box(v_res_87_);
return v_r_88_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2(void){
_start:
{
lean_object* v___x_92_; lean_object* v___x_93_; 
v___x_92_ = lean_unsigned_to_nat(2u);
v___x_93_ = lean_nat_to_int(v___x_92_);
return v___x_93_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3(void){
_start:
{
lean_object* v___x_94_; lean_object* v___x_95_; 
v___x_94_ = lean_unsigned_to_nat(1u);
v___x_95_ = lean_nat_to_int(v___x_94_);
return v___x_95_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__10(void){
_start:
{
lean_object* v___x_108_; lean_object* v___x_109_; 
v___x_108_ = lean_unsigned_to_nat(0u);
v___x_109_ = lean_nat_to_int(v___x_108_);
return v___x_109_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr(lean_object* v_x_116_, lean_object* v_prec_117_){
_start:
{
lean_object* v___y_119_; lean_object* v___y_126_; lean_object* v___y_127_; lean_object* v___y_128_; 
switch(lean_obj_tag(v_x_116_))
{
case 0:
{
lean_object* v___x_134_; uint8_t v___x_135_; 
v___x_134_ = lean_unsigned_to_nat(1024u);
v___x_135_ = lean_nat_dec_le(v___x_134_, v_prec_117_);
if (v___x_135_ == 0)
{
lean_object* v___x_136_; 
v___x_136_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2, &lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2_once, _init_lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2);
v___y_119_ = v___x_136_;
goto v___jp_118_;
}
else
{
lean_object* v___x_137_; 
v___x_137_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3, &lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3_once, _init_lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3);
v___y_119_ = v___x_137_;
goto v___jp_118_;
}
}
case 1:
{
uint8_t v_a_138_; lean_object* v___y_140_; lean_object* v___x_148_; uint8_t v___x_149_; 
v_a_138_ = lean_ctor_get_uint8(v_x_116_, 0);
lean_dec_ref_known(v_x_116_, 0);
v___x_148_ = lean_unsigned_to_nat(1024u);
v___x_149_ = lean_nat_dec_le(v___x_148_, v_prec_117_);
if (v___x_149_ == 0)
{
lean_object* v___x_150_; 
v___x_150_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2, &lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2_once, _init_lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2);
v___y_140_ = v___x_150_;
goto v___jp_139_;
}
else
{
lean_object* v___x_151_; 
v___x_151_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3, &lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3_once, _init_lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3);
v___y_140_ = v___x_151_;
goto v___jp_139_;
}
v___jp_139_:
{
lean_object* v___x_141_; lean_object* v___x_142_; lean_object* v___x_143_; lean_object* v___x_144_; uint8_t v___x_145_; lean_object* v___x_146_; lean_object* v___x_147_; 
v___x_141_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__6));
v___x_142_ = l_Bool_repr___redArg(v_a_138_);
v___x_143_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_143_, 0, v___x_141_);
lean_ctor_set(v___x_143_, 1, v___x_142_);
lean_inc(v___y_140_);
v___x_144_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_144_, 0, v___y_140_);
lean_ctor_set(v___x_144_, 1, v___x_143_);
v___x_145_ = 0;
v___x_146_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_146_, 0, v___x_144_);
lean_ctor_set_uint8(v___x_146_, sizeof(void*)*1, v___x_145_);
v___x_147_ = l_Repr_addAppParen(v___x_146_, v_prec_117_);
return v___x_147_;
}
}
case 2:
{
lean_object* v_a_152_; lean_object* v___x_154_; uint8_t v_isShared_155_; uint8_t v_isSharedCheck_175_; 
v_a_152_ = lean_ctor_get(v_x_116_, 0);
v_isSharedCheck_175_ = !lean_is_exclusive(v_x_116_);
if (v_isSharedCheck_175_ == 0)
{
v___x_154_ = v_x_116_;
v_isShared_155_ = v_isSharedCheck_175_;
goto v_resetjp_153_;
}
else
{
lean_inc(v_a_152_);
lean_dec(v_x_116_);
v___x_154_ = lean_box(0);
v_isShared_155_ = v_isSharedCheck_175_;
goto v_resetjp_153_;
}
v_resetjp_153_:
{
lean_object* v___y_157_; lean_object* v___x_171_; uint8_t v___x_172_; 
v___x_171_ = lean_unsigned_to_nat(1024u);
v___x_172_ = lean_nat_dec_le(v___x_171_, v_prec_117_);
if (v___x_172_ == 0)
{
lean_object* v___x_173_; 
v___x_173_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2, &lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2_once, _init_lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2);
v___y_157_ = v___x_173_;
goto v___jp_156_;
}
else
{
lean_object* v___x_174_; 
v___x_174_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3, &lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3_once, _init_lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3);
v___y_157_ = v___x_174_;
goto v___jp_156_;
}
v___jp_156_:
{
lean_object* v___x_158_; lean_object* v___x_159_; uint8_t v___x_160_; 
v___x_158_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__9));
v___x_159_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__10, &lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__10_once, _init_lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__10);
v___x_160_ = lean_int_dec_lt(v_a_152_, v___x_159_);
if (v___x_160_ == 0)
{
lean_object* v___x_161_; lean_object* v___x_163_; 
v___x_161_ = l_Int_repr(v_a_152_);
lean_dec(v_a_152_);
if (v_isShared_155_ == 0)
{
lean_ctor_set_tag(v___x_154_, 3);
lean_ctor_set(v___x_154_, 0, v___x_161_);
v___x_163_ = v___x_154_;
goto v_reusejp_162_;
}
else
{
lean_object* v_reuseFailAlloc_164_; 
v_reuseFailAlloc_164_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v_reuseFailAlloc_164_, 0, v___x_161_);
v___x_163_ = v_reuseFailAlloc_164_;
goto v_reusejp_162_;
}
v_reusejp_162_:
{
v___y_126_ = v___y_157_;
v___y_127_ = v___x_158_;
v___y_128_ = v___x_163_;
goto v___jp_125_;
}
}
else
{
lean_object* v___x_165_; lean_object* v___x_166_; lean_object* v___x_168_; 
v___x_165_ = lean_unsigned_to_nat(1024u);
v___x_166_ = l_Int_repr(v_a_152_);
lean_dec(v_a_152_);
if (v_isShared_155_ == 0)
{
lean_ctor_set_tag(v___x_154_, 3);
lean_ctor_set(v___x_154_, 0, v___x_166_);
v___x_168_ = v___x_154_;
goto v_reusejp_167_;
}
else
{
lean_object* v_reuseFailAlloc_170_; 
v_reuseFailAlloc_170_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v_reuseFailAlloc_170_, 0, v___x_166_);
v___x_168_ = v_reuseFailAlloc_170_;
goto v_reusejp_167_;
}
v_reusejp_167_:
{
lean_object* v___x_169_; 
v___x_169_ = l_Repr_addAppParen(v___x_168_, v___x_165_);
v___y_126_ = v___y_157_;
v___y_127_ = v___x_158_;
v___y_128_ = v___x_169_;
goto v___jp_125_;
}
}
}
}
}
default: 
{
lean_object* v_a_176_; lean_object* v___x_178_; uint8_t v_isShared_179_; uint8_t v_isSharedCheck_196_; 
v_a_176_ = lean_ctor_get(v_x_116_, 0);
v_isSharedCheck_196_ = !lean_is_exclusive(v_x_116_);
if (v_isSharedCheck_196_ == 0)
{
v___x_178_ = v_x_116_;
v_isShared_179_ = v_isSharedCheck_196_;
goto v_resetjp_177_;
}
else
{
lean_inc(v_a_176_);
lean_dec(v_x_116_);
v___x_178_ = lean_box(0);
v_isShared_179_ = v_isSharedCheck_196_;
goto v_resetjp_177_;
}
v_resetjp_177_:
{
lean_object* v___y_181_; lean_object* v___x_192_; uint8_t v___x_193_; 
v___x_192_ = lean_unsigned_to_nat(1024u);
v___x_193_ = lean_nat_dec_le(v___x_192_, v_prec_117_);
if (v___x_193_ == 0)
{
lean_object* v___x_194_; 
v___x_194_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2, &lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2_once, _init_lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2);
v___y_181_ = v___x_194_;
goto v___jp_180_;
}
else
{
lean_object* v___x_195_; 
v___x_195_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3, &lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3_once, _init_lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3);
v___y_181_ = v___x_195_;
goto v___jp_180_;
}
v___jp_180_:
{
lean_object* v___x_182_; lean_object* v___x_183_; lean_object* v___x_185_; 
v___x_182_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__13));
v___x_183_ = l_String_quote(v_a_176_);
if (v_isShared_179_ == 0)
{
lean_ctor_set(v___x_178_, 0, v___x_183_);
v___x_185_ = v___x_178_;
goto v_reusejp_184_;
}
else
{
lean_object* v_reuseFailAlloc_191_; 
v_reuseFailAlloc_191_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v_reuseFailAlloc_191_, 0, v___x_183_);
v___x_185_ = v_reuseFailAlloc_191_;
goto v_reusejp_184_;
}
v_reusejp_184_:
{
lean_object* v___x_186_; lean_object* v___x_187_; uint8_t v___x_188_; lean_object* v___x_189_; lean_object* v___x_190_; 
v___x_186_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_186_, 0, v___x_182_);
lean_ctor_set(v___x_186_, 1, v___x_185_);
lean_inc(v___y_181_);
v___x_187_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_187_, 0, v___y_181_);
lean_ctor_set(v___x_187_, 1, v___x_186_);
v___x_188_ = 0;
v___x_189_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_189_, 0, v___x_187_);
lean_ctor_set_uint8(v___x_189_, sizeof(void*)*1, v___x_188_);
v___x_190_ = l_Repr_addAppParen(v___x_189_, v_prec_117_);
return v___x_190_;
}
}
}
}
}
v___jp_118_:
{
lean_object* v___x_120_; lean_object* v___x_121_; uint8_t v___x_122_; lean_object* v___x_123_; lean_object* v___x_124_; 
v___x_120_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__1));
lean_inc(v___y_119_);
v___x_121_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_121_, 0, v___y_119_);
lean_ctor_set(v___x_121_, 1, v___x_120_);
v___x_122_ = 0;
v___x_123_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_123_, 0, v___x_121_);
lean_ctor_set_uint8(v___x_123_, sizeof(void*)*1, v___x_122_);
v___x_124_ = l_Repr_addAppParen(v___x_123_, v_prec_117_);
return v___x_124_;
}
v___jp_125_:
{
lean_object* v___x_129_; lean_object* v___x_130_; uint8_t v___x_131_; lean_object* v___x_132_; lean_object* v___x_133_; 
lean_inc(v___y_127_);
v___x_129_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_129_, 0, v___y_127_);
lean_ctor_set(v___x_129_, 1, v___y_128_);
lean_inc(v___y_126_);
v___x_130_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_130_, 0, v___y_126_);
lean_ctor_set(v___x_130_, 1, v___x_129_);
v___x_131_ = 0;
v___x_132_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_132_, 0, v___x_130_);
lean_ctor_set_uint8(v___x_132_, sizeof(void*)*1, v___x_131_);
v___x_133_ = l_Repr_addAppParen(v___x_132_, v_prec_117_);
return v___x_133_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprAtom_repr___boxed(lean_object* v_x_197_, lean_object* v_prec_198_){
_start:
{
lean_object* v_res_199_; 
v_res_199_ = lp_algalVerification_Algal_Memory_instReprAtom_repr(v_x_197_, v_prec_198_);
lean_dec(v_prec_198_);
return v_res_199_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_ctorIdx(lean_object* v_x_202_){
_start:
{
if (lean_obj_tag(v_x_202_) == 0)
{
lean_object* v___x_203_; 
v___x_203_ = lean_unsigned_to_nat(0u);
return v___x_203_;
}
else
{
lean_object* v___x_204_; 
v___x_204_ = lean_unsigned_to_nat(1u);
return v___x_204_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_ctorIdx___boxed(lean_object* v_x_205_){
_start:
{
lean_object* v_res_206_; 
v_res_206_ = lp_algalVerification_Algal_Memory_Term_ctorIdx(v_x_205_);
lean_dec_ref(v_x_205_);
return v_res_206_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_ctorElim___redArg(lean_object* v_t_207_, lean_object* v_k_208_){
_start:
{
if (lean_obj_tag(v_t_207_) == 0)
{
lean_object* v_a_209_; lean_object* v___x_210_; 
v_a_209_ = lean_ctor_get(v_t_207_, 0);
lean_inc(v_a_209_);
lean_dec_ref_known(v_t_207_, 1);
v___x_210_ = lean_apply_1(v_k_208_, v_a_209_);
return v___x_210_;
}
else
{
lean_object* v_a_211_; lean_object* v___x_212_; 
v_a_211_ = lean_ctor_get(v_t_207_, 0);
lean_inc_ref(v_a_211_);
lean_dec_ref_known(v_t_207_, 1);
v___x_212_ = lean_apply_1(v_k_208_, v_a_211_);
return v___x_212_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_ctorElim(lean_object* v_motive_213_, lean_object* v_ctorIdx_214_, lean_object* v_t_215_, lean_object* v_h_216_, lean_object* v_k_217_){
_start:
{
lean_object* v___x_218_; 
v___x_218_ = lp_algalVerification_Algal_Memory_Term_ctorElim___redArg(v_t_215_, v_k_217_);
return v___x_218_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_ctorElim___boxed(lean_object* v_motive_219_, lean_object* v_ctorIdx_220_, lean_object* v_t_221_, lean_object* v_h_222_, lean_object* v_k_223_){
_start:
{
lean_object* v_res_224_; 
v_res_224_ = lp_algalVerification_Algal_Memory_Term_ctorElim(v_motive_219_, v_ctorIdx_220_, v_t_221_, v_h_222_, v_k_223_);
lean_dec(v_ctorIdx_220_);
return v_res_224_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_atom_elim___redArg(lean_object* v_t_225_, lean_object* v_atom_226_){
_start:
{
lean_object* v___x_227_; 
v___x_227_ = lp_algalVerification_Algal_Memory_Term_ctorElim___redArg(v_t_225_, v_atom_226_);
return v___x_227_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_atom_elim(lean_object* v_motive_228_, lean_object* v_t_229_, lean_object* v_h_230_, lean_object* v_atom_231_){
_start:
{
lean_object* v___x_232_; 
v___x_232_ = lp_algalVerification_Algal_Memory_Term_ctorElim___redArg(v_t_229_, v_atom_231_);
return v___x_232_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_var_elim___redArg(lean_object* v_t_233_, lean_object* v_var_234_){
_start:
{
lean_object* v___x_235_; 
v___x_235_ = lp_algalVerification_Algal_Memory_Term_ctorElim___redArg(v_t_233_, v_var_234_);
return v___x_235_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_var_elim(lean_object* v_motive_236_, lean_object* v_t_237_, lean_object* v_h_238_, lean_object* v_var_239_){
_start:
{
lean_object* v___x_240_; 
v___x_240_ = lp_algalVerification_Algal_Memory_Term_ctorElim___redArg(v_t_237_, v_var_239_);
return v___x_240_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqTerm_decEq(lean_object* v_x_241_, lean_object* v_x_242_){
_start:
{
if (lean_obj_tag(v_x_241_) == 0)
{
if (lean_obj_tag(v_x_242_) == 0)
{
lean_object* v_a_243_; lean_object* v_a_244_; uint8_t v___x_245_; 
v_a_243_ = lean_ctor_get(v_x_241_, 0);
v_a_244_ = lean_ctor_get(v_x_242_, 0);
v___x_245_ = lp_algalVerification_Algal_Memory_instDecidableEqAtom_decEq(v_a_243_, v_a_244_);
return v___x_245_;
}
else
{
uint8_t v___x_246_; 
v___x_246_ = 0;
return v___x_246_;
}
}
else
{
if (lean_obj_tag(v_x_242_) == 0)
{
uint8_t v___x_247_; 
v___x_247_ = 0;
return v___x_247_;
}
else
{
lean_object* v_a_248_; lean_object* v_a_249_; uint8_t v___x_250_; 
v_a_248_ = lean_ctor_get(v_x_241_, 0);
v_a_249_ = lean_ctor_get(v_x_242_, 0);
v___x_250_ = lean_string_dec_eq(v_a_248_, v_a_249_);
return v___x_250_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqTerm_decEq___boxed(lean_object* v_x_251_, lean_object* v_x_252_){
_start:
{
uint8_t v_res_253_; lean_object* v_r_254_; 
v_res_253_ = lp_algalVerification_Algal_Memory_instDecidableEqTerm_decEq(v_x_251_, v_x_252_);
lean_dec_ref(v_x_252_);
lean_dec_ref(v_x_251_);
v_r_254_ = lean_box(v_res_253_);
return v_r_254_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqTerm(lean_object* v_x_255_, lean_object* v_x_256_){
_start:
{
uint8_t v___x_257_; 
v___x_257_ = lp_algalVerification_Algal_Memory_instDecidableEqTerm_decEq(v_x_255_, v_x_256_);
return v___x_257_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqTerm___boxed(lean_object* v_x_258_, lean_object* v_x_259_){
_start:
{
uint8_t v_res_260_; lean_object* v_r_261_; 
v_res_260_ = lp_algalVerification_Algal_Memory_instDecidableEqTerm(v_x_258_, v_x_259_);
lean_dec_ref(v_x_259_);
lean_dec_ref(v_x_258_);
v_r_261_ = lean_box(v_res_260_);
return v_r_261_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprTerm_repr(lean_object* v_x_274_, lean_object* v_prec_275_){
_start:
{
if (lean_obj_tag(v_x_274_) == 0)
{
lean_object* v_a_276_; lean_object* v___y_278_; lean_object* v___x_287_; uint8_t v___x_288_; 
v_a_276_ = lean_ctor_get(v_x_274_, 0);
lean_inc(v_a_276_);
lean_dec_ref_known(v_x_274_, 1);
v___x_287_ = lean_unsigned_to_nat(1024u);
v___x_288_ = lean_nat_dec_le(v___x_287_, v_prec_275_);
if (v___x_288_ == 0)
{
lean_object* v___x_289_; 
v___x_289_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2, &lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2_once, _init_lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2);
v___y_278_ = v___x_289_;
goto v___jp_277_;
}
else
{
lean_object* v___x_290_; 
v___x_290_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3, &lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3_once, _init_lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3);
v___y_278_ = v___x_290_;
goto v___jp_277_;
}
v___jp_277_:
{
lean_object* v___x_279_; lean_object* v___x_280_; lean_object* v___x_281_; lean_object* v___x_282_; lean_object* v___x_283_; uint8_t v___x_284_; lean_object* v___x_285_; lean_object* v___x_286_; 
v___x_279_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__2));
v___x_280_ = lean_unsigned_to_nat(1024u);
v___x_281_ = lp_algalVerification_Algal_Memory_instReprAtom_repr(v_a_276_, v___x_280_);
v___x_282_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_282_, 0, v___x_279_);
lean_ctor_set(v___x_282_, 1, v___x_281_);
lean_inc(v___y_278_);
v___x_283_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_283_, 0, v___y_278_);
lean_ctor_set(v___x_283_, 1, v___x_282_);
v___x_284_ = 0;
v___x_285_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_285_, 0, v___x_283_);
lean_ctor_set_uint8(v___x_285_, sizeof(void*)*1, v___x_284_);
v___x_286_ = l_Repr_addAppParen(v___x_285_, v_prec_275_);
return v___x_286_;
}
}
else
{
lean_object* v_a_291_; lean_object* v___x_293_; uint8_t v_isShared_294_; uint8_t v_isSharedCheck_311_; 
v_a_291_ = lean_ctor_get(v_x_274_, 0);
v_isSharedCheck_311_ = !lean_is_exclusive(v_x_274_);
if (v_isSharedCheck_311_ == 0)
{
v___x_293_ = v_x_274_;
v_isShared_294_ = v_isSharedCheck_311_;
goto v_resetjp_292_;
}
else
{
lean_inc(v_a_291_);
lean_dec(v_x_274_);
v___x_293_ = lean_box(0);
v_isShared_294_ = v_isSharedCheck_311_;
goto v_resetjp_292_;
}
v_resetjp_292_:
{
lean_object* v___y_296_; lean_object* v___x_307_; uint8_t v___x_308_; 
v___x_307_ = lean_unsigned_to_nat(1024u);
v___x_308_ = lean_nat_dec_le(v___x_307_, v_prec_275_);
if (v___x_308_ == 0)
{
lean_object* v___x_309_; 
v___x_309_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2, &lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2_once, _init_lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__2);
v___y_296_ = v___x_309_;
goto v___jp_295_;
}
else
{
lean_object* v___x_310_; 
v___x_310_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3, &lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3_once, _init_lp_algalVerification_Algal_Memory_instReprAtom_repr___closed__3);
v___y_296_ = v___x_310_;
goto v___jp_295_;
}
v___jp_295_:
{
lean_object* v___x_297_; lean_object* v___x_298_; lean_object* v___x_300_; 
v___x_297_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprTerm_repr___closed__5));
v___x_298_ = l_String_quote(v_a_291_);
if (v_isShared_294_ == 0)
{
lean_ctor_set_tag(v___x_293_, 3);
lean_ctor_set(v___x_293_, 0, v___x_298_);
v___x_300_ = v___x_293_;
goto v_reusejp_299_;
}
else
{
lean_object* v_reuseFailAlloc_306_; 
v_reuseFailAlloc_306_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v_reuseFailAlloc_306_, 0, v___x_298_);
v___x_300_ = v_reuseFailAlloc_306_;
goto v_reusejp_299_;
}
v_reusejp_299_:
{
lean_object* v___x_301_; lean_object* v___x_302_; uint8_t v___x_303_; lean_object* v___x_304_; lean_object* v___x_305_; 
v___x_301_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_301_, 0, v___x_297_);
lean_ctor_set(v___x_301_, 1, v___x_300_);
lean_inc(v___y_296_);
v___x_302_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_302_, 0, v___y_296_);
lean_ctor_set(v___x_302_, 1, v___x_301_);
v___x_303_ = 0;
v___x_304_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_304_, 0, v___x_302_);
lean_ctor_set_uint8(v___x_304_, sizeof(void*)*1, v___x_303_);
v___x_305_ = l_Repr_addAppParen(v___x_304_, v_prec_275_);
return v___x_305_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprTerm_repr___boxed(lean_object* v_x_312_, lean_object* v_prec_313_){
_start:
{
lean_object* v_res_314_; 
v_res_314_ = lp_algalVerification_Algal_Memory_instReprTerm_repr(v_x_312_, v_prec_313_);
lean_dec(v_prec_313_);
return v_res_314_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Term_atomOf(lean_object* v_x_317_){
_start:
{
if (lean_obj_tag(v_x_317_) == 0)
{
lean_object* v_a_318_; lean_object* v___x_320_; uint8_t v_isShared_321_; uint8_t v_isSharedCheck_325_; 
v_a_318_ = lean_ctor_get(v_x_317_, 0);
v_isSharedCheck_325_ = !lean_is_exclusive(v_x_317_);
if (v_isSharedCheck_325_ == 0)
{
v___x_320_ = v_x_317_;
v_isShared_321_ = v_isSharedCheck_325_;
goto v_resetjp_319_;
}
else
{
lean_inc(v_a_318_);
lean_dec(v_x_317_);
v___x_320_ = lean_box(0);
v_isShared_321_ = v_isSharedCheck_325_;
goto v_resetjp_319_;
}
v_resetjp_319_:
{
lean_object* v___x_323_; 
if (v_isShared_321_ == 0)
{
lean_ctor_set_tag(v___x_320_, 1);
v___x_323_ = v___x_320_;
goto v_reusejp_322_;
}
else
{
lean_object* v_reuseFailAlloc_324_; 
v_reuseFailAlloc_324_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_324_, 0, v_a_318_);
v___x_323_ = v_reuseFailAlloc_324_;
goto v_reusejp_322_;
}
v_reusejp_322_:
{
return v___x_323_;
}
}
}
else
{
lean_object* v___x_326_; 
lean_dec_ref_known(v_x_317_, 1);
v___x_326_ = lean_box(0);
return v___x_326_;
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqLiteral_decEq(lean_object* v_x_327_, lean_object* v_x_328_){
_start:
{
lean_object* v_relation_329_; lean_object* v_terms_330_; lean_object* v_relation_331_; lean_object* v_terms_332_; uint8_t v___x_333_; 
v_relation_329_ = lean_ctor_get(v_x_327_, 0);
lean_inc_ref(v_relation_329_);
v_terms_330_ = lean_ctor_get(v_x_327_, 1);
lean_inc(v_terms_330_);
lean_dec_ref(v_x_327_);
v_relation_331_ = lean_ctor_get(v_x_328_, 0);
lean_inc_ref(v_relation_331_);
v_terms_332_ = lean_ctor_get(v_x_328_, 1);
lean_inc(v_terms_332_);
lean_dec_ref(v_x_328_);
v___x_333_ = lean_string_dec_eq(v_relation_329_, v_relation_331_);
lean_dec_ref(v_relation_331_);
lean_dec_ref(v_relation_329_);
if (v___x_333_ == 0)
{
lean_dec(v_terms_332_);
lean_dec(v_terms_330_);
return v___x_333_;
}
else
{
lean_object* v___x_334_; uint8_t v___x_335_; 
v___x_334_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Memory_instDecidableEqTerm___boxed), 2, 0);
v___x_335_ = l_instDecidableEqList___redArg(v___x_334_, v_terms_330_, v_terms_332_);
return v___x_335_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqLiteral_decEq___boxed(lean_object* v_x_336_, lean_object* v_x_337_){
_start:
{
uint8_t v_res_338_; lean_object* v_r_339_; 
v_res_338_ = lp_algalVerification_Algal_Memory_instDecidableEqLiteral_decEq(v_x_336_, v_x_337_);
v_r_339_ = lean_box(v_res_338_);
return v_r_339_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqLiteral(lean_object* v_x_340_, lean_object* v_x_341_){
_start:
{
uint8_t v___x_342_; 
v___x_342_ = lp_algalVerification_Algal_Memory_instDecidableEqLiteral_decEq(v_x_340_, v_x_341_);
return v___x_342_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqLiteral___boxed(lean_object* v_x_343_, lean_object* v_x_344_){
_start:
{
uint8_t v_res_345_; lean_object* v_r_346_; 
v_res_345_ = lp_algalVerification_Algal_Memory_instDecidableEqLiteral(v_x_343_, v_x_344_);
v_r_346_ = lean_box(v_res_345_);
return v_r_346_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0_spec__0___lam__0(lean_object* v___y_347_){
_start:
{
lean_object* v___x_348_; lean_object* v___x_349_; 
v___x_348_ = lean_unsigned_to_nat(0u);
v___x_349_ = lp_algalVerification_Algal_Memory_instReprTerm_repr(v___y_347_, v___x_348_);
return v___x_349_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0_spec__0_spec__1_spec__2(lean_object* v_x_350_, lean_object* v_x_351_, lean_object* v_x_352_){
_start:
{
if (lean_obj_tag(v_x_352_) == 0)
{
lean_dec(v_x_350_);
return v_x_351_;
}
else
{
lean_object* v_head_353_; lean_object* v_tail_354_; lean_object* v___x_356_; uint8_t v_isShared_357_; uint8_t v_isSharedCheck_365_; 
v_head_353_ = lean_ctor_get(v_x_352_, 0);
v_tail_354_ = lean_ctor_get(v_x_352_, 1);
v_isSharedCheck_365_ = !lean_is_exclusive(v_x_352_);
if (v_isSharedCheck_365_ == 0)
{
v___x_356_ = v_x_352_;
v_isShared_357_ = v_isSharedCheck_365_;
goto v_resetjp_355_;
}
else
{
lean_inc(v_tail_354_);
lean_inc(v_head_353_);
lean_dec(v_x_352_);
v___x_356_ = lean_box(0);
v_isShared_357_ = v_isSharedCheck_365_;
goto v_resetjp_355_;
}
v_resetjp_355_:
{
lean_object* v___x_359_; 
lean_inc(v_x_350_);
if (v_isShared_357_ == 0)
{
lean_ctor_set_tag(v___x_356_, 5);
lean_ctor_set(v___x_356_, 1, v_x_350_);
lean_ctor_set(v___x_356_, 0, v_x_351_);
v___x_359_ = v___x_356_;
goto v_reusejp_358_;
}
else
{
lean_object* v_reuseFailAlloc_364_; 
v_reuseFailAlloc_364_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v_reuseFailAlloc_364_, 0, v_x_351_);
lean_ctor_set(v_reuseFailAlloc_364_, 1, v_x_350_);
v___x_359_ = v_reuseFailAlloc_364_;
goto v_reusejp_358_;
}
v_reusejp_358_:
{
lean_object* v___x_360_; lean_object* v___x_361_; lean_object* v___x_362_; 
v___x_360_ = lean_unsigned_to_nat(0u);
v___x_361_ = lp_algalVerification_Algal_Memory_instReprTerm_repr(v_head_353_, v___x_360_);
v___x_362_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_362_, 0, v___x_359_);
lean_ctor_set(v___x_362_, 1, v___x_361_);
v_x_351_ = v___x_362_;
v_x_352_ = v_tail_354_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0_spec__0_spec__1(lean_object* v_x_366_, lean_object* v_x_367_, lean_object* v_x_368_){
_start:
{
if (lean_obj_tag(v_x_368_) == 0)
{
lean_dec(v_x_366_);
return v_x_367_;
}
else
{
lean_object* v_head_369_; lean_object* v_tail_370_; lean_object* v___x_372_; uint8_t v_isShared_373_; uint8_t v_isSharedCheck_381_; 
v_head_369_ = lean_ctor_get(v_x_368_, 0);
v_tail_370_ = lean_ctor_get(v_x_368_, 1);
v_isSharedCheck_381_ = !lean_is_exclusive(v_x_368_);
if (v_isSharedCheck_381_ == 0)
{
v___x_372_ = v_x_368_;
v_isShared_373_ = v_isSharedCheck_381_;
goto v_resetjp_371_;
}
else
{
lean_inc(v_tail_370_);
lean_inc(v_head_369_);
lean_dec(v_x_368_);
v___x_372_ = lean_box(0);
v_isShared_373_ = v_isSharedCheck_381_;
goto v_resetjp_371_;
}
v_resetjp_371_:
{
lean_object* v___x_375_; 
lean_inc(v_x_366_);
if (v_isShared_373_ == 0)
{
lean_ctor_set_tag(v___x_372_, 5);
lean_ctor_set(v___x_372_, 1, v_x_366_);
lean_ctor_set(v___x_372_, 0, v_x_367_);
v___x_375_ = v___x_372_;
goto v_reusejp_374_;
}
else
{
lean_object* v_reuseFailAlloc_380_; 
v_reuseFailAlloc_380_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v_reuseFailAlloc_380_, 0, v_x_367_);
lean_ctor_set(v_reuseFailAlloc_380_, 1, v_x_366_);
v___x_375_ = v_reuseFailAlloc_380_;
goto v_reusejp_374_;
}
v_reusejp_374_:
{
lean_object* v___x_376_; lean_object* v___x_377_; lean_object* v___x_378_; lean_object* v___x_379_; 
v___x_376_ = lean_unsigned_to_nat(0u);
v___x_377_ = lp_algalVerification_Algal_Memory_instReprTerm_repr(v_head_369_, v___x_376_);
v___x_378_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_378_, 0, v___x_375_);
lean_ctor_set(v___x_378_, 1, v___x_377_);
v___x_379_ = lp_algalVerification_List_foldl___at___00List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0_spec__0_spec__1_spec__2(v_x_366_, v___x_378_, v_tail_370_);
return v___x_379_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0_spec__0(lean_object* v_x_382_, lean_object* v_x_383_){
_start:
{
if (lean_obj_tag(v_x_382_) == 0)
{
lean_object* v___x_384_; 
lean_dec(v_x_383_);
v___x_384_ = lean_box(0);
return v___x_384_;
}
else
{
lean_object* v_tail_385_; 
v_tail_385_ = lean_ctor_get(v_x_382_, 1);
if (lean_obj_tag(v_tail_385_) == 0)
{
lean_object* v_head_386_; lean_object* v___x_387_; 
lean_dec(v_x_383_);
v_head_386_ = lean_ctor_get(v_x_382_, 0);
lean_inc(v_head_386_);
lean_dec_ref_known(v_x_382_, 2);
v___x_387_ = lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0_spec__0___lam__0(v_head_386_);
return v___x_387_;
}
else
{
lean_object* v_head_388_; lean_object* v___x_389_; lean_object* v___x_390_; 
lean_inc(v_tail_385_);
v_head_388_ = lean_ctor_get(v_x_382_, 0);
lean_inc(v_head_388_);
lean_dec_ref_known(v_x_382_, 2);
v___x_389_ = lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0_spec__0___lam__0(v_head_388_);
v___x_390_ = lp_algalVerification_List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0_spec__0_spec__1(v_x_383_, v___x_389_, v_tail_385_);
return v___x_390_;
}
}
}
}
static lean_object* _init_lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__7(void){
_start:
{
lean_object* v___x_402_; lean_object* v___x_403_; 
v___x_402_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__2));
v___x_403_ = lean_string_length(v___x_402_);
return v___x_403_;
}
}
static lean_object* _init_lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__8(void){
_start:
{
lean_object* v___x_404_; lean_object* v___x_405_; 
v___x_404_ = lean_obj_once(&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__7, &lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__7_once, _init_lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__7);
v___x_405_ = lean_nat_to_int(v___x_404_);
return v___x_405_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg(lean_object* v_a_410_){
_start:
{
if (lean_obj_tag(v_a_410_) == 0)
{
lean_object* v___x_411_; 
v___x_411_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__1));
return v___x_411_;
}
else
{
lean_object* v___x_412_; lean_object* v___x_413_; lean_object* v___x_414_; lean_object* v___x_415_; lean_object* v___x_416_; lean_object* v___x_417_; lean_object* v___x_418_; lean_object* v___x_419_; uint8_t v___x_420_; lean_object* v___x_421_; 
v___x_412_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__5));
v___x_413_ = lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0_spec__0(v_a_410_, v___x_412_);
v___x_414_ = lean_obj_once(&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__8, &lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__8_once, _init_lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__8);
v___x_415_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__9));
v___x_416_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_416_, 0, v___x_415_);
lean_ctor_set(v___x_416_, 1, v___x_413_);
v___x_417_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__10));
v___x_418_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_418_, 0, v___x_416_);
lean_ctor_set(v___x_418_, 1, v___x_417_);
v___x_419_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_419_, 0, v___x_414_);
lean_ctor_set(v___x_419_, 1, v___x_418_);
v___x_420_ = 0;
v___x_421_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_421_, 0, v___x_419_);
lean_ctor_set_uint8(v___x_421_, sizeof(void*)*1, v___x_420_);
return v___x_421_;
}
}
}
static lean_object* _init_lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__7(void){
_start:
{
lean_object* v___x_435_; lean_object* v___x_436_; 
v___x_435_ = lean_unsigned_to_nat(12u);
v___x_436_ = lean_nat_to_int(v___x_435_);
return v___x_436_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__10(void){
_start:
{
lean_object* v___x_440_; lean_object* v___x_441_; 
v___x_440_ = lean_unsigned_to_nat(9u);
v___x_441_ = lean_nat_to_int(v___x_440_);
return v___x_441_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__12(void){
_start:
{
lean_object* v___x_443_; lean_object* v___x_444_; 
v___x_443_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__0));
v___x_444_ = lean_string_length(v___x_443_);
return v___x_444_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__13(void){
_start:
{
lean_object* v___x_445_; lean_object* v___x_446_; 
v___x_445_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__12, &lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__12_once, _init_lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__12);
v___x_446_ = lean_nat_to_int(v___x_445_);
return v___x_446_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg(lean_object* v_x_451_){
_start:
{
lean_object* v_relation_452_; lean_object* v_terms_453_; lean_object* v___x_455_; uint8_t v_isShared_456_; uint8_t v_isSharedCheck_487_; 
v_relation_452_ = lean_ctor_get(v_x_451_, 0);
v_terms_453_ = lean_ctor_get(v_x_451_, 1);
v_isSharedCheck_487_ = !lean_is_exclusive(v_x_451_);
if (v_isSharedCheck_487_ == 0)
{
v___x_455_ = v_x_451_;
v_isShared_456_ = v_isSharedCheck_487_;
goto v_resetjp_454_;
}
else
{
lean_inc(v_terms_453_);
lean_inc(v_relation_452_);
lean_dec(v_x_451_);
v___x_455_ = lean_box(0);
v_isShared_456_ = v_isSharedCheck_487_;
goto v_resetjp_454_;
}
v_resetjp_454_:
{
lean_object* v___x_457_; lean_object* v___x_458_; lean_object* v___x_459_; lean_object* v___x_460_; lean_object* v___x_461_; lean_object* v___x_463_; 
v___x_457_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__5));
v___x_458_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__6));
v___x_459_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__7, &lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__7_once, _init_lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__7);
v___x_460_ = l_String_quote(v_relation_452_);
v___x_461_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_461_, 0, v___x_460_);
if (v_isShared_456_ == 0)
{
lean_ctor_set_tag(v___x_455_, 4);
lean_ctor_set(v___x_455_, 1, v___x_461_);
lean_ctor_set(v___x_455_, 0, v___x_459_);
v___x_463_ = v___x_455_;
goto v_reusejp_462_;
}
else
{
lean_object* v_reuseFailAlloc_486_; 
v_reuseFailAlloc_486_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v_reuseFailAlloc_486_, 0, v___x_459_);
lean_ctor_set(v_reuseFailAlloc_486_, 1, v___x_461_);
v___x_463_ = v_reuseFailAlloc_486_;
goto v_reusejp_462_;
}
v_reusejp_462_:
{
uint8_t v___x_464_; lean_object* v___x_465_; lean_object* v___x_466_; lean_object* v___x_467_; lean_object* v___x_468_; lean_object* v___x_469_; lean_object* v___x_470_; lean_object* v___x_471_; lean_object* v___x_472_; lean_object* v___x_473_; lean_object* v___x_474_; lean_object* v___x_475_; lean_object* v___x_476_; lean_object* v___x_477_; lean_object* v___x_478_; lean_object* v___x_479_; lean_object* v___x_480_; lean_object* v___x_481_; lean_object* v___x_482_; lean_object* v___x_483_; lean_object* v___x_484_; lean_object* v___x_485_; 
v___x_464_ = 0;
v___x_465_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_465_, 0, v___x_463_);
lean_ctor_set_uint8(v___x_465_, sizeof(void*)*1, v___x_464_);
v___x_466_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_466_, 0, v___x_458_);
lean_ctor_set(v___x_466_, 1, v___x_465_);
v___x_467_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__4));
v___x_468_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_468_, 0, v___x_466_);
lean_ctor_set(v___x_468_, 1, v___x_467_);
v___x_469_ = lean_box(1);
v___x_470_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_470_, 0, v___x_468_);
lean_ctor_set(v___x_470_, 1, v___x_469_);
v___x_471_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__9));
v___x_472_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_472_, 0, v___x_470_);
lean_ctor_set(v___x_472_, 1, v___x_471_);
v___x_473_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_473_, 0, v___x_472_);
lean_ctor_set(v___x_473_, 1, v___x_457_);
v___x_474_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__10, &lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__10_once, _init_lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__10);
v___x_475_ = lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg(v_terms_453_);
v___x_476_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_476_, 0, v___x_474_);
lean_ctor_set(v___x_476_, 1, v___x_475_);
v___x_477_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_477_, 0, v___x_476_);
lean_ctor_set_uint8(v___x_477_, sizeof(void*)*1, v___x_464_);
v___x_478_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_478_, 0, v___x_473_);
lean_ctor_set(v___x_478_, 1, v___x_477_);
v___x_479_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__13, &lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__13_once, _init_lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__13);
v___x_480_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__14));
v___x_481_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_481_, 0, v___x_480_);
lean_ctor_set(v___x_481_, 1, v___x_478_);
v___x_482_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__15));
v___x_483_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_483_, 0, v___x_481_);
lean_ctor_set(v___x_483_, 1, v___x_482_);
v___x_484_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_484_, 0, v___x_479_);
lean_ctor_set(v___x_484_, 1, v___x_483_);
v___x_485_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_485_, 0, v___x_484_);
lean_ctor_set_uint8(v___x_485_, sizeof(void*)*1, v___x_464_);
return v___x_485_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr(lean_object* v_x_488_, lean_object* v_prec_489_){
_start:
{
lean_object* v___x_490_; 
v___x_490_ = lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg(v_x_488_);
return v___x_490_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprLiteral_repr___boxed(lean_object* v_x_491_, lean_object* v_prec_492_){
_start:
{
lean_object* v_res_493_; 
v_res_493_ = lp_algalVerification_Algal_Memory_instReprLiteral_repr(v_x_491_, v_prec_492_);
lean_dec(v_prec_492_);
return v_res_493_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0(lean_object* v_a_494_, lean_object* v_n_495_){
_start:
{
lean_object* v___x_496_; 
v___x_496_ = lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg(v_a_494_);
return v___x_496_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___boxed(lean_object* v_a_497_, lean_object* v_n_498_){
_start:
{
lean_object* v_res_499_; 
v_res_499_ = lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0(v_a_497_, v_n_498_);
lean_dec(v_n_498_);
return v_res_499_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqTuple_decEq(lean_object* v_x_502_, lean_object* v_x_503_){
_start:
{
lean_object* v_relation_504_; lean_object* v_args_505_; lean_object* v_relation_506_; lean_object* v_args_507_; uint8_t v___x_508_; 
v_relation_504_ = lean_ctor_get(v_x_502_, 0);
lean_inc_ref(v_relation_504_);
v_args_505_ = lean_ctor_get(v_x_502_, 1);
lean_inc(v_args_505_);
lean_dec_ref(v_x_502_);
v_relation_506_ = lean_ctor_get(v_x_503_, 0);
lean_inc_ref(v_relation_506_);
v_args_507_ = lean_ctor_get(v_x_503_, 1);
lean_inc(v_args_507_);
lean_dec_ref(v_x_503_);
v___x_508_ = lean_string_dec_eq(v_relation_504_, v_relation_506_);
lean_dec_ref(v_relation_506_);
lean_dec_ref(v_relation_504_);
if (v___x_508_ == 0)
{
lean_dec(v_args_507_);
lean_dec(v_args_505_);
return v___x_508_;
}
else
{
lean_object* v___x_509_; uint8_t v___x_510_; 
v___x_509_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Memory_instDecidableEqAtom___boxed), 2, 0);
v___x_510_ = l_instDecidableEqList___redArg(v___x_509_, v_args_505_, v_args_507_);
return v___x_510_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqTuple_decEq___boxed(lean_object* v_x_511_, lean_object* v_x_512_){
_start:
{
uint8_t v_res_513_; lean_object* v_r_514_; 
v_res_513_ = lp_algalVerification_Algal_Memory_instDecidableEqTuple_decEq(v_x_511_, v_x_512_);
v_r_514_ = lean_box(v_res_513_);
return v_r_514_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqTuple(lean_object* v_x_515_, lean_object* v_x_516_){
_start:
{
uint8_t v___x_517_; 
v___x_517_ = lp_algalVerification_Algal_Memory_instDecidableEqTuple_decEq(v_x_515_, v_x_516_);
return v___x_517_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqTuple___boxed(lean_object* v_x_518_, lean_object* v_x_519_){
_start:
{
uint8_t v_res_520_; lean_object* v_r_521_; 
v_res_520_ = lp_algalVerification_Algal_Memory_instDecidableEqTuple(v_x_518_, v_x_519_);
v_r_521_ = lean_box(v_res_520_);
return v_r_521_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0_spec__0___lam__0(lean_object* v___y_522_){
_start:
{
lean_object* v___x_523_; lean_object* v___x_524_; 
v___x_523_ = lean_unsigned_to_nat(0u);
v___x_524_ = lp_algalVerification_Algal_Memory_instReprAtom_repr(v___y_522_, v___x_523_);
return v___x_524_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0_spec__0_spec__1_spec__2(lean_object* v_x_525_, lean_object* v_x_526_, lean_object* v_x_527_){
_start:
{
if (lean_obj_tag(v_x_527_) == 0)
{
lean_dec(v_x_525_);
return v_x_526_;
}
else
{
lean_object* v_head_528_; lean_object* v_tail_529_; lean_object* v___x_531_; uint8_t v_isShared_532_; uint8_t v_isSharedCheck_540_; 
v_head_528_ = lean_ctor_get(v_x_527_, 0);
v_tail_529_ = lean_ctor_get(v_x_527_, 1);
v_isSharedCheck_540_ = !lean_is_exclusive(v_x_527_);
if (v_isSharedCheck_540_ == 0)
{
v___x_531_ = v_x_527_;
v_isShared_532_ = v_isSharedCheck_540_;
goto v_resetjp_530_;
}
else
{
lean_inc(v_tail_529_);
lean_inc(v_head_528_);
lean_dec(v_x_527_);
v___x_531_ = lean_box(0);
v_isShared_532_ = v_isSharedCheck_540_;
goto v_resetjp_530_;
}
v_resetjp_530_:
{
lean_object* v___x_534_; 
lean_inc(v_x_525_);
if (v_isShared_532_ == 0)
{
lean_ctor_set_tag(v___x_531_, 5);
lean_ctor_set(v___x_531_, 1, v_x_525_);
lean_ctor_set(v___x_531_, 0, v_x_526_);
v___x_534_ = v___x_531_;
goto v_reusejp_533_;
}
else
{
lean_object* v_reuseFailAlloc_539_; 
v_reuseFailAlloc_539_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v_reuseFailAlloc_539_, 0, v_x_526_);
lean_ctor_set(v_reuseFailAlloc_539_, 1, v_x_525_);
v___x_534_ = v_reuseFailAlloc_539_;
goto v_reusejp_533_;
}
v_reusejp_533_:
{
lean_object* v___x_535_; lean_object* v___x_536_; lean_object* v___x_537_; 
v___x_535_ = lean_unsigned_to_nat(0u);
v___x_536_ = lp_algalVerification_Algal_Memory_instReprAtom_repr(v_head_528_, v___x_535_);
v___x_537_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_537_, 0, v___x_534_);
lean_ctor_set(v___x_537_, 1, v___x_536_);
v_x_526_ = v___x_537_;
v_x_527_ = v_tail_529_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0_spec__0_spec__1(lean_object* v_x_541_, lean_object* v_x_542_, lean_object* v_x_543_){
_start:
{
if (lean_obj_tag(v_x_543_) == 0)
{
lean_dec(v_x_541_);
return v_x_542_;
}
else
{
lean_object* v_head_544_; lean_object* v_tail_545_; lean_object* v___x_547_; uint8_t v_isShared_548_; uint8_t v_isSharedCheck_556_; 
v_head_544_ = lean_ctor_get(v_x_543_, 0);
v_tail_545_ = lean_ctor_get(v_x_543_, 1);
v_isSharedCheck_556_ = !lean_is_exclusive(v_x_543_);
if (v_isSharedCheck_556_ == 0)
{
v___x_547_ = v_x_543_;
v_isShared_548_ = v_isSharedCheck_556_;
goto v_resetjp_546_;
}
else
{
lean_inc(v_tail_545_);
lean_inc(v_head_544_);
lean_dec(v_x_543_);
v___x_547_ = lean_box(0);
v_isShared_548_ = v_isSharedCheck_556_;
goto v_resetjp_546_;
}
v_resetjp_546_:
{
lean_object* v___x_550_; 
lean_inc(v_x_541_);
if (v_isShared_548_ == 0)
{
lean_ctor_set_tag(v___x_547_, 5);
lean_ctor_set(v___x_547_, 1, v_x_541_);
lean_ctor_set(v___x_547_, 0, v_x_542_);
v___x_550_ = v___x_547_;
goto v_reusejp_549_;
}
else
{
lean_object* v_reuseFailAlloc_555_; 
v_reuseFailAlloc_555_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v_reuseFailAlloc_555_, 0, v_x_542_);
lean_ctor_set(v_reuseFailAlloc_555_, 1, v_x_541_);
v___x_550_ = v_reuseFailAlloc_555_;
goto v_reusejp_549_;
}
v_reusejp_549_:
{
lean_object* v___x_551_; lean_object* v___x_552_; lean_object* v___x_553_; lean_object* v___x_554_; 
v___x_551_ = lean_unsigned_to_nat(0u);
v___x_552_ = lp_algalVerification_Algal_Memory_instReprAtom_repr(v_head_544_, v___x_551_);
v___x_553_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_553_, 0, v___x_550_);
lean_ctor_set(v___x_553_, 1, v___x_552_);
v___x_554_ = lp_algalVerification_List_foldl___at___00List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0_spec__0_spec__1_spec__2(v_x_541_, v___x_553_, v_tail_545_);
return v___x_554_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0_spec__0(lean_object* v_x_557_, lean_object* v_x_558_){
_start:
{
if (lean_obj_tag(v_x_557_) == 0)
{
lean_object* v___x_559_; 
lean_dec(v_x_558_);
v___x_559_ = lean_box(0);
return v___x_559_;
}
else
{
lean_object* v_tail_560_; 
v_tail_560_ = lean_ctor_get(v_x_557_, 1);
if (lean_obj_tag(v_tail_560_) == 0)
{
lean_object* v_head_561_; lean_object* v___x_562_; 
lean_dec(v_x_558_);
v_head_561_ = lean_ctor_get(v_x_557_, 0);
lean_inc(v_head_561_);
lean_dec_ref_known(v_x_557_, 2);
v___x_562_ = lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0_spec__0___lam__0(v_head_561_);
return v___x_562_;
}
else
{
lean_object* v_head_563_; lean_object* v___x_564_; lean_object* v___x_565_; 
lean_inc(v_tail_560_);
v_head_563_ = lean_ctor_get(v_x_557_, 0);
lean_inc(v_head_563_);
lean_dec_ref_known(v_x_557_, 2);
v___x_564_ = lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0_spec__0___lam__0(v_head_563_);
v___x_565_ = lp_algalVerification_List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0_spec__0_spec__1(v_x_558_, v___x_564_, v_tail_560_);
return v___x_565_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0___redArg(lean_object* v_a_566_){
_start:
{
if (lean_obj_tag(v_a_566_) == 0)
{
lean_object* v___x_567_; 
v___x_567_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__1));
return v___x_567_;
}
else
{
lean_object* v___x_568_; lean_object* v___x_569_; lean_object* v___x_570_; lean_object* v___x_571_; lean_object* v___x_572_; lean_object* v___x_573_; lean_object* v___x_574_; lean_object* v___x_575_; uint8_t v___x_576_; lean_object* v___x_577_; 
v___x_568_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__5));
v___x_569_ = lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0_spec__0(v_a_566_, v___x_568_);
v___x_570_ = lean_obj_once(&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__8, &lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__8_once, _init_lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__8);
v___x_571_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__9));
v___x_572_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_572_, 0, v___x_571_);
lean_ctor_set(v___x_572_, 1, v___x_569_);
v___x_573_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__10));
v___x_574_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_574_, 0, v___x_572_);
lean_ctor_set(v___x_574_, 1, v___x_573_);
v___x_575_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_575_, 0, v___x_570_);
lean_ctor_set(v___x_575_, 1, v___x_574_);
v___x_576_ = 0;
v___x_577_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_577_, 0, v___x_575_);
lean_ctor_set_uint8(v___x_577_, sizeof(void*)*1, v___x_576_);
return v___x_577_;
}
}
}
static lean_object* _init_lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg___closed__2(void){
_start:
{
lean_object* v___x_581_; lean_object* v___x_582_; 
v___x_581_ = lean_unsigned_to_nat(8u);
v___x_582_ = lean_nat_to_int(v___x_581_);
return v___x_582_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg(lean_object* v_x_583_){
_start:
{
lean_object* v_relation_584_; lean_object* v_args_585_; lean_object* v___x_587_; uint8_t v_isShared_588_; uint8_t v_isSharedCheck_619_; 
v_relation_584_ = lean_ctor_get(v_x_583_, 0);
v_args_585_ = lean_ctor_get(v_x_583_, 1);
v_isSharedCheck_619_ = !lean_is_exclusive(v_x_583_);
if (v_isSharedCheck_619_ == 0)
{
v___x_587_ = v_x_583_;
v_isShared_588_ = v_isSharedCheck_619_;
goto v_resetjp_586_;
}
else
{
lean_inc(v_args_585_);
lean_inc(v_relation_584_);
lean_dec(v_x_583_);
v___x_587_ = lean_box(0);
v_isShared_588_ = v_isSharedCheck_619_;
goto v_resetjp_586_;
}
v_resetjp_586_:
{
lean_object* v___x_589_; lean_object* v___x_590_; lean_object* v___x_591_; lean_object* v___x_592_; lean_object* v___x_593_; lean_object* v___x_595_; 
v___x_589_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__5));
v___x_590_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__6));
v___x_591_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__7, &lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__7_once, _init_lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__7);
v___x_592_ = l_String_quote(v_relation_584_);
v___x_593_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_593_, 0, v___x_592_);
if (v_isShared_588_ == 0)
{
lean_ctor_set_tag(v___x_587_, 4);
lean_ctor_set(v___x_587_, 1, v___x_593_);
lean_ctor_set(v___x_587_, 0, v___x_591_);
v___x_595_ = v___x_587_;
goto v_reusejp_594_;
}
else
{
lean_object* v_reuseFailAlloc_618_; 
v_reuseFailAlloc_618_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v_reuseFailAlloc_618_, 0, v___x_591_);
lean_ctor_set(v_reuseFailAlloc_618_, 1, v___x_593_);
v___x_595_ = v_reuseFailAlloc_618_;
goto v_reusejp_594_;
}
v_reusejp_594_:
{
uint8_t v___x_596_; lean_object* v___x_597_; lean_object* v___x_598_; lean_object* v___x_599_; lean_object* v___x_600_; lean_object* v___x_601_; lean_object* v___x_602_; lean_object* v___x_603_; lean_object* v___x_604_; lean_object* v___x_605_; lean_object* v___x_606_; lean_object* v___x_607_; lean_object* v___x_608_; lean_object* v___x_609_; lean_object* v___x_610_; lean_object* v___x_611_; lean_object* v___x_612_; lean_object* v___x_613_; lean_object* v___x_614_; lean_object* v___x_615_; lean_object* v___x_616_; lean_object* v___x_617_; 
v___x_596_ = 0;
v___x_597_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_597_, 0, v___x_595_);
lean_ctor_set_uint8(v___x_597_, sizeof(void*)*1, v___x_596_);
v___x_598_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_598_, 0, v___x_590_);
lean_ctor_set(v___x_598_, 1, v___x_597_);
v___x_599_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__4));
v___x_600_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_600_, 0, v___x_598_);
lean_ctor_set(v___x_600_, 1, v___x_599_);
v___x_601_ = lean_box(1);
v___x_602_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_602_, 0, v___x_600_);
lean_ctor_set(v___x_602_, 1, v___x_601_);
v___x_603_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg___closed__1));
v___x_604_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_604_, 0, v___x_602_);
lean_ctor_set(v___x_604_, 1, v___x_603_);
v___x_605_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_605_, 0, v___x_604_);
lean_ctor_set(v___x_605_, 1, v___x_589_);
v___x_606_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg___closed__2, &lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg___closed__2_once, _init_lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg___closed__2);
v___x_607_ = lp_algalVerification_List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0___redArg(v_args_585_);
v___x_608_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_608_, 0, v___x_606_);
lean_ctor_set(v___x_608_, 1, v___x_607_);
v___x_609_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_609_, 0, v___x_608_);
lean_ctor_set_uint8(v___x_609_, sizeof(void*)*1, v___x_596_);
v___x_610_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_610_, 0, v___x_605_);
lean_ctor_set(v___x_610_, 1, v___x_609_);
v___x_611_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__13, &lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__13_once, _init_lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__13);
v___x_612_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__14));
v___x_613_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_613_, 0, v___x_612_);
lean_ctor_set(v___x_613_, 1, v___x_610_);
v___x_614_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__15));
v___x_615_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_615_, 0, v___x_613_);
lean_ctor_set(v___x_615_, 1, v___x_614_);
v___x_616_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_616_, 0, v___x_611_);
lean_ctor_set(v___x_616_, 1, v___x_615_);
v___x_617_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_617_, 0, v___x_616_);
lean_ctor_set_uint8(v___x_617_, sizeof(void*)*1, v___x_596_);
return v___x_617_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprTuple_repr(lean_object* v_x_620_, lean_object* v_prec_621_){
_start:
{
lean_object* v___x_622_; 
v___x_622_ = lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg(v_x_620_);
return v___x_622_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprTuple_repr___boxed(lean_object* v_x_623_, lean_object* v_prec_624_){
_start:
{
lean_object* v_res_625_; 
v_res_625_ = lp_algalVerification_Algal_Memory_instReprTuple_repr(v_x_623_, v_prec_624_);
lean_dec(v_prec_624_);
return v_res_625_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0(lean_object* v_a_626_, lean_object* v_n_627_){
_start:
{
lean_object* v___x_628_; 
v___x_628_ = lp_algalVerification_List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0___redArg(v_a_626_);
return v___x_628_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0___boxed(lean_object* v_a_629_, lean_object* v_n_630_){
_start:
{
lean_object* v_res_631_; 
v_res_631_ = lp_algalVerification_List_repr___at___00Algal_Memory_instReprTuple_repr_spec__0(v_a_629_, v_n_630_);
lean_dec(v_n_630_);
return v_res_631_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqFact_decEq(lean_object* v_x_634_, lean_object* v_x_635_){
_start:
{
lean_object* v_tuple_636_; lean_object* v_sources_637_; lean_object* v_tuple_638_; lean_object* v_sources_639_; uint8_t v___x_640_; 
v_tuple_636_ = lean_ctor_get(v_x_634_, 0);
lean_inc_ref(v_tuple_636_);
v_sources_637_ = lean_ctor_get(v_x_634_, 1);
lean_inc(v_sources_637_);
lean_dec_ref(v_x_634_);
v_tuple_638_ = lean_ctor_get(v_x_635_, 0);
lean_inc_ref(v_tuple_638_);
v_sources_639_ = lean_ctor_get(v_x_635_, 1);
lean_inc(v_sources_639_);
lean_dec_ref(v_x_635_);
v___x_640_ = lp_algalVerification_Algal_Memory_instDecidableEqTuple_decEq(v_tuple_636_, v_tuple_638_);
if (v___x_640_ == 0)
{
lean_dec(v_sources_639_);
lean_dec(v_sources_637_);
return v___x_640_;
}
else
{
lean_object* v___x_641_; uint8_t v___x_642_; 
v___x_641_ = lean_alloc_closure((void*)(l_instDecidableEqString___boxed), 2, 0);
v___x_642_ = l_instDecidableEqList___redArg(v___x_641_, v_sources_637_, v_sources_639_);
return v___x_642_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqFact_decEq___boxed(lean_object* v_x_643_, lean_object* v_x_644_){
_start:
{
uint8_t v_res_645_; lean_object* v_r_646_; 
v_res_645_ = lp_algalVerification_Algal_Memory_instDecidableEqFact_decEq(v_x_643_, v_x_644_);
v_r_646_ = lean_box(v_res_645_);
return v_r_646_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqFact(lean_object* v_x_647_, lean_object* v_x_648_){
_start:
{
uint8_t v___x_649_; 
v___x_649_ = lp_algalVerification_Algal_Memory_instDecidableEqFact_decEq(v_x_647_, v_x_648_);
return v___x_649_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqFact___boxed(lean_object* v_x_650_, lean_object* v_x_651_){
_start:
{
uint8_t v_res_652_; lean_object* v_r_653_; 
v_res_652_ = lp_algalVerification_Algal_Memory_instDecidableEqFact(v_x_650_, v_x_651_);
v_r_653_ = lean_box(v_res_652_);
return v_r_653_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__6(void){
_start:
{
lean_object* v___x_666_; lean_object* v___x_667_; 
v___x_666_ = lean_unsigned_to_nat(11u);
v___x_667_ = lean_nat_to_int(v___x_666_);
return v___x_667_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprFact_repr___redArg(lean_object* v_x_668_){
_start:
{
lean_object* v_tuple_669_; lean_object* v_sources_670_; lean_object* v___x_672_; uint8_t v_isShared_673_; uint8_t v_isSharedCheck_703_; 
v_tuple_669_ = lean_ctor_get(v_x_668_, 0);
v_sources_670_ = lean_ctor_get(v_x_668_, 1);
v_isSharedCheck_703_ = !lean_is_exclusive(v_x_668_);
if (v_isSharedCheck_703_ == 0)
{
v___x_672_ = v_x_668_;
v_isShared_673_ = v_isSharedCheck_703_;
goto v_resetjp_671_;
}
else
{
lean_inc(v_sources_670_);
lean_inc(v_tuple_669_);
lean_dec(v_x_668_);
v___x_672_ = lean_box(0);
v_isShared_673_ = v_isSharedCheck_703_;
goto v_resetjp_671_;
}
v_resetjp_671_:
{
lean_object* v___x_674_; lean_object* v___x_675_; lean_object* v___x_676_; lean_object* v___x_677_; lean_object* v___x_679_; 
v___x_674_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__5));
v___x_675_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__3));
v___x_676_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__10, &lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__10_once, _init_lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__10);
v___x_677_ = lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg(v_tuple_669_);
if (v_isShared_673_ == 0)
{
lean_ctor_set_tag(v___x_672_, 4);
lean_ctor_set(v___x_672_, 1, v___x_677_);
lean_ctor_set(v___x_672_, 0, v___x_676_);
v___x_679_ = v___x_672_;
goto v_reusejp_678_;
}
else
{
lean_object* v_reuseFailAlloc_702_; 
v_reuseFailAlloc_702_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v_reuseFailAlloc_702_, 0, v___x_676_);
lean_ctor_set(v_reuseFailAlloc_702_, 1, v___x_677_);
v___x_679_ = v_reuseFailAlloc_702_;
goto v_reusejp_678_;
}
v_reusejp_678_:
{
uint8_t v___x_680_; lean_object* v___x_681_; lean_object* v___x_682_; lean_object* v___x_683_; lean_object* v___x_684_; lean_object* v___x_685_; lean_object* v___x_686_; lean_object* v___x_687_; lean_object* v___x_688_; lean_object* v___x_689_; lean_object* v___x_690_; lean_object* v___x_691_; lean_object* v___x_692_; lean_object* v___x_693_; lean_object* v___x_694_; lean_object* v___x_695_; lean_object* v___x_696_; lean_object* v___x_697_; lean_object* v___x_698_; lean_object* v___x_699_; lean_object* v___x_700_; lean_object* v___x_701_; 
v___x_680_ = 0;
v___x_681_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_681_, 0, v___x_679_);
lean_ctor_set_uint8(v___x_681_, sizeof(void*)*1, v___x_680_);
v___x_682_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_682_, 0, v___x_675_);
lean_ctor_set(v___x_682_, 1, v___x_681_);
v___x_683_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__4));
v___x_684_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_684_, 0, v___x_682_);
lean_ctor_set(v___x_684_, 1, v___x_683_);
v___x_685_ = lean_box(1);
v___x_686_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_686_, 0, v___x_684_);
lean_ctor_set(v___x_686_, 1, v___x_685_);
v___x_687_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__5));
v___x_688_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_688_, 0, v___x_686_);
lean_ctor_set(v___x_688_, 1, v___x_687_);
v___x_689_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_689_, 0, v___x_688_);
lean_ctor_set(v___x_689_, 1, v___x_674_);
v___x_690_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__6, &lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__6_once, _init_lp_algalVerification_Algal_Memory_instReprFact_repr___redArg___closed__6);
v___x_691_ = l_List_repr_x27___at___00Lean_Syntax_instReprPreresolved_repr_spec__0___redArg(v_sources_670_);
v___x_692_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_692_, 0, v___x_690_);
lean_ctor_set(v___x_692_, 1, v___x_691_);
v___x_693_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_693_, 0, v___x_692_);
lean_ctor_set_uint8(v___x_693_, sizeof(void*)*1, v___x_680_);
v___x_694_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_694_, 0, v___x_689_);
lean_ctor_set(v___x_694_, 1, v___x_693_);
v___x_695_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__13, &lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__13_once, _init_lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__13);
v___x_696_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__14));
v___x_697_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_697_, 0, v___x_696_);
lean_ctor_set(v___x_697_, 1, v___x_694_);
v___x_698_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__15));
v___x_699_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_699_, 0, v___x_697_);
lean_ctor_set(v___x_699_, 1, v___x_698_);
v___x_700_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_700_, 0, v___x_695_);
lean_ctor_set(v___x_700_, 1, v___x_699_);
v___x_701_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_701_, 0, v___x_700_);
lean_ctor_set_uint8(v___x_701_, sizeof(void*)*1, v___x_680_);
return v___x_701_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprFact_repr(lean_object* v_x_704_, lean_object* v_prec_705_){
_start:
{
lean_object* v___x_706_; 
v___x_706_ = lp_algalVerification_Algal_Memory_instReprFact_repr___redArg(v_x_704_);
return v___x_706_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprFact_repr___boxed(lean_object* v_x_707_, lean_object* v_prec_708_){
_start:
{
lean_object* v_res_709_; 
v_res_709_ = lp_algalVerification_Algal_Memory_instReprFact_repr(v_x_707_, v_prec_708_);
lean_dec(v_prec_708_);
return v_res_709_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_Fact_lit_spec__0(lean_object* v_a_712_, lean_object* v_a_713_){
_start:
{
if (lean_obj_tag(v_a_712_) == 0)
{
lean_object* v___x_714_; 
v___x_714_ = l_List_reverse___redArg(v_a_713_);
return v___x_714_;
}
else
{
lean_object* v_head_715_; lean_object* v_tail_716_; lean_object* v___x_718_; uint8_t v_isShared_719_; uint8_t v_isSharedCheck_725_; 
v_head_715_ = lean_ctor_get(v_a_712_, 0);
v_tail_716_ = lean_ctor_get(v_a_712_, 1);
v_isSharedCheck_725_ = !lean_is_exclusive(v_a_712_);
if (v_isSharedCheck_725_ == 0)
{
v___x_718_ = v_a_712_;
v_isShared_719_ = v_isSharedCheck_725_;
goto v_resetjp_717_;
}
else
{
lean_inc(v_tail_716_);
lean_inc(v_head_715_);
lean_dec(v_a_712_);
v___x_718_ = lean_box(0);
v_isShared_719_ = v_isSharedCheck_725_;
goto v_resetjp_717_;
}
v_resetjp_717_:
{
lean_object* v___x_720_; lean_object* v___x_722_; 
v___x_720_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_720_, 0, v_head_715_);
if (v_isShared_719_ == 0)
{
lean_ctor_set(v___x_718_, 1, v_a_713_);
lean_ctor_set(v___x_718_, 0, v___x_720_);
v___x_722_ = v___x_718_;
goto v_reusejp_721_;
}
else
{
lean_object* v_reuseFailAlloc_724_; 
v_reuseFailAlloc_724_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_724_, 0, v___x_720_);
lean_ctor_set(v_reuseFailAlloc_724_, 1, v_a_713_);
v___x_722_ = v_reuseFailAlloc_724_;
goto v_reusejp_721_;
}
v_reusejp_721_:
{
v_a_712_ = v_tail_716_;
v_a_713_ = v___x_722_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_Fact_lit(lean_object* v_f_726_){
_start:
{
lean_object* v_tuple_727_; lean_object* v_relation_728_; lean_object* v_args_729_; lean_object* v___x_731_; uint8_t v_isShared_732_; uint8_t v_isSharedCheck_738_; 
v_tuple_727_ = lean_ctor_get(v_f_726_, 0);
lean_inc_ref(v_tuple_727_);
lean_dec_ref(v_f_726_);
v_relation_728_ = lean_ctor_get(v_tuple_727_, 0);
v_args_729_ = lean_ctor_get(v_tuple_727_, 1);
v_isSharedCheck_738_ = !lean_is_exclusive(v_tuple_727_);
if (v_isSharedCheck_738_ == 0)
{
v___x_731_ = v_tuple_727_;
v_isShared_732_ = v_isSharedCheck_738_;
goto v_resetjp_730_;
}
else
{
lean_inc(v_args_729_);
lean_inc(v_relation_728_);
lean_dec(v_tuple_727_);
v___x_731_ = lean_box(0);
v_isShared_732_ = v_isSharedCheck_738_;
goto v_resetjp_730_;
}
v_resetjp_730_:
{
lean_object* v___x_733_; lean_object* v___x_734_; lean_object* v___x_736_; 
v___x_733_ = lean_box(0);
v___x_734_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_Fact_lit_spec__0(v_args_729_, v___x_733_);
if (v_isShared_732_ == 0)
{
lean_ctor_set(v___x_731_, 1, v___x_734_);
v___x_736_ = v___x_731_;
goto v_reusejp_735_;
}
else
{
lean_object* v_reuseFailAlloc_737_; 
v_reuseFailAlloc_737_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_737_, 0, v_relation_728_);
lean_ctor_set(v_reuseFailAlloc_737_, 1, v___x_734_);
v___x_736_ = v_reuseFailAlloc_737_;
goto v_reusejp_735_;
}
v_reusejp_735_:
{
return v___x_736_;
}
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqRule_decEq(lean_object* v_x_739_, lean_object* v_x_740_){
_start:
{
lean_object* v_id_741_; lean_object* v_head_742_; lean_object* v_body_743_; lean_object* v_id_744_; lean_object* v_head_745_; lean_object* v_body_746_; uint8_t v___x_747_; 
v_id_741_ = lean_ctor_get(v_x_739_, 0);
lean_inc_ref(v_id_741_);
v_head_742_ = lean_ctor_get(v_x_739_, 1);
lean_inc_ref(v_head_742_);
v_body_743_ = lean_ctor_get(v_x_739_, 2);
lean_inc(v_body_743_);
lean_dec_ref(v_x_739_);
v_id_744_ = lean_ctor_get(v_x_740_, 0);
lean_inc_ref(v_id_744_);
v_head_745_ = lean_ctor_get(v_x_740_, 1);
lean_inc_ref(v_head_745_);
v_body_746_ = lean_ctor_get(v_x_740_, 2);
lean_inc(v_body_746_);
lean_dec_ref(v_x_740_);
v___x_747_ = lean_string_dec_eq(v_id_741_, v_id_744_);
lean_dec_ref(v_id_744_);
lean_dec_ref(v_id_741_);
if (v___x_747_ == 0)
{
lean_dec(v_body_746_);
lean_dec_ref(v_head_745_);
lean_dec(v_body_743_);
lean_dec_ref(v_head_742_);
return v___x_747_;
}
else
{
uint8_t v___x_748_; 
v___x_748_ = lp_algalVerification_Algal_Memory_instDecidableEqLiteral_decEq(v_head_742_, v_head_745_);
if (v___x_748_ == 0)
{
lean_dec(v_body_746_);
lean_dec(v_body_743_);
return v___x_748_;
}
else
{
lean_object* v___x_749_; uint8_t v___x_750_; 
v___x_749_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Memory_instDecidableEqLiteral___boxed), 2, 0);
v___x_750_ = l_instDecidableEqList___redArg(v___x_749_, v_body_743_, v_body_746_);
return v___x_750_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqRule_decEq___boxed(lean_object* v_x_751_, lean_object* v_x_752_){
_start:
{
uint8_t v_res_753_; lean_object* v_r_754_; 
v_res_753_ = lp_algalVerification_Algal_Memory_instDecidableEqRule_decEq(v_x_751_, v_x_752_);
v_r_754_ = lean_box(v_res_753_);
return v_r_754_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqRule(lean_object* v_x_755_, lean_object* v_x_756_){
_start:
{
uint8_t v___x_757_; 
v___x_757_ = lp_algalVerification_Algal_Memory_instDecidableEqRule_decEq(v_x_755_, v_x_756_);
return v___x_757_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqRule___boxed(lean_object* v_x_758_, lean_object* v_x_759_){
_start:
{
uint8_t v_res_760_; lean_object* v_r_761_; 
v_res_760_ = lp_algalVerification_Algal_Memory_instDecidableEqRule(v_x_758_, v_x_759_);
v_r_761_ = lean_box(v_res_760_);
return v_r_761_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprRule_repr_spec__0_spec__0_spec__1_spec__2(lean_object* v_x_762_, lean_object* v_x_763_, lean_object* v_x_764_){
_start:
{
if (lean_obj_tag(v_x_764_) == 0)
{
lean_dec(v_x_762_);
return v_x_763_;
}
else
{
lean_object* v_head_765_; lean_object* v_tail_766_; lean_object* v___x_768_; uint8_t v_isShared_769_; uint8_t v_isSharedCheck_776_; 
v_head_765_ = lean_ctor_get(v_x_764_, 0);
v_tail_766_ = lean_ctor_get(v_x_764_, 1);
v_isSharedCheck_776_ = !lean_is_exclusive(v_x_764_);
if (v_isSharedCheck_776_ == 0)
{
v___x_768_ = v_x_764_;
v_isShared_769_ = v_isSharedCheck_776_;
goto v_resetjp_767_;
}
else
{
lean_inc(v_tail_766_);
lean_inc(v_head_765_);
lean_dec(v_x_764_);
v___x_768_ = lean_box(0);
v_isShared_769_ = v_isSharedCheck_776_;
goto v_resetjp_767_;
}
v_resetjp_767_:
{
lean_object* v___x_771_; 
lean_inc(v_x_762_);
if (v_isShared_769_ == 0)
{
lean_ctor_set_tag(v___x_768_, 5);
lean_ctor_set(v___x_768_, 1, v_x_762_);
lean_ctor_set(v___x_768_, 0, v_x_763_);
v___x_771_ = v___x_768_;
goto v_reusejp_770_;
}
else
{
lean_object* v_reuseFailAlloc_775_; 
v_reuseFailAlloc_775_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v_reuseFailAlloc_775_, 0, v_x_763_);
lean_ctor_set(v_reuseFailAlloc_775_, 1, v_x_762_);
v___x_771_ = v_reuseFailAlloc_775_;
goto v_reusejp_770_;
}
v_reusejp_770_:
{
lean_object* v___x_772_; lean_object* v___x_773_; 
v___x_772_ = lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg(v_head_765_);
v___x_773_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_773_, 0, v___x_771_);
lean_ctor_set(v___x_773_, 1, v___x_772_);
v_x_763_ = v___x_773_;
v_x_764_ = v_tail_766_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprRule_repr_spec__0_spec__0_spec__1(lean_object* v_x_777_, lean_object* v_x_778_, lean_object* v_x_779_){
_start:
{
if (lean_obj_tag(v_x_779_) == 0)
{
lean_dec(v_x_777_);
return v_x_778_;
}
else
{
lean_object* v_head_780_; lean_object* v_tail_781_; lean_object* v___x_783_; uint8_t v_isShared_784_; uint8_t v_isSharedCheck_791_; 
v_head_780_ = lean_ctor_get(v_x_779_, 0);
v_tail_781_ = lean_ctor_get(v_x_779_, 1);
v_isSharedCheck_791_ = !lean_is_exclusive(v_x_779_);
if (v_isSharedCheck_791_ == 0)
{
v___x_783_ = v_x_779_;
v_isShared_784_ = v_isSharedCheck_791_;
goto v_resetjp_782_;
}
else
{
lean_inc(v_tail_781_);
lean_inc(v_head_780_);
lean_dec(v_x_779_);
v___x_783_ = lean_box(0);
v_isShared_784_ = v_isSharedCheck_791_;
goto v_resetjp_782_;
}
v_resetjp_782_:
{
lean_object* v___x_786_; 
lean_inc(v_x_777_);
if (v_isShared_784_ == 0)
{
lean_ctor_set_tag(v___x_783_, 5);
lean_ctor_set(v___x_783_, 1, v_x_777_);
lean_ctor_set(v___x_783_, 0, v_x_778_);
v___x_786_ = v___x_783_;
goto v_reusejp_785_;
}
else
{
lean_object* v_reuseFailAlloc_790_; 
v_reuseFailAlloc_790_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v_reuseFailAlloc_790_, 0, v_x_778_);
lean_ctor_set(v_reuseFailAlloc_790_, 1, v_x_777_);
v___x_786_ = v_reuseFailAlloc_790_;
goto v_reusejp_785_;
}
v_reusejp_785_:
{
lean_object* v___x_787_; lean_object* v___x_788_; lean_object* v___x_789_; 
v___x_787_ = lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg(v_head_780_);
v___x_788_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_788_, 0, v___x_786_);
lean_ctor_set(v___x_788_, 1, v___x_787_);
v___x_789_ = lp_algalVerification_List_foldl___at___00List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprRule_repr_spec__0_spec__0_spec__1_spec__2(v_x_777_, v___x_788_, v_tail_781_);
return v___x_789_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprRule_repr_spec__0_spec__0(lean_object* v_x_792_, lean_object* v_x_793_){
_start:
{
if (lean_obj_tag(v_x_792_) == 0)
{
lean_object* v___x_794_; 
lean_dec(v_x_793_);
v___x_794_ = lean_box(0);
return v___x_794_;
}
else
{
lean_object* v_tail_795_; 
v_tail_795_ = lean_ctor_get(v_x_792_, 1);
if (lean_obj_tag(v_tail_795_) == 0)
{
lean_object* v_head_796_; lean_object* v___x_797_; 
lean_dec(v_x_793_);
v_head_796_ = lean_ctor_get(v_x_792_, 0);
lean_inc(v_head_796_);
lean_dec_ref_known(v_x_792_, 2);
v___x_797_ = lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg(v_head_796_);
return v___x_797_;
}
else
{
lean_object* v_head_798_; lean_object* v___x_799_; lean_object* v___x_800_; 
lean_inc(v_tail_795_);
v_head_798_ = lean_ctor_get(v_x_792_, 0);
lean_inc(v_head_798_);
lean_dec_ref_known(v_x_792_, 2);
v___x_799_ = lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg(v_head_798_);
v___x_800_ = lp_algalVerification_List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprRule_repr_spec__0_spec__0_spec__1(v_x_793_, v___x_799_, v_tail_795_);
return v___x_800_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprRule_repr_spec__0___redArg(lean_object* v_a_801_){
_start:
{
if (lean_obj_tag(v_a_801_) == 0)
{
lean_object* v___x_802_; 
v___x_802_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__1));
return v___x_802_;
}
else
{
lean_object* v___x_803_; lean_object* v___x_804_; lean_object* v___x_805_; lean_object* v___x_806_; lean_object* v___x_807_; lean_object* v___x_808_; lean_object* v___x_809_; lean_object* v___x_810_; uint8_t v___x_811_; lean_object* v___x_812_; 
v___x_803_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__5));
v___x_804_ = lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Memory_instReprRule_repr_spec__0_spec__0(v_a_801_, v___x_803_);
v___x_805_ = lean_obj_once(&lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__8, &lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__8_once, _init_lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__8);
v___x_806_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__9));
v___x_807_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_807_, 0, v___x_806_);
lean_ctor_set(v___x_807_, 1, v___x_804_);
v___x_808_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__10));
v___x_809_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_809_, 0, v___x_807_);
lean_ctor_set(v___x_809_, 1, v___x_808_);
v___x_810_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_810_, 0, v___x_805_);
lean_ctor_set(v___x_810_, 1, v___x_809_);
v___x_811_ = 0;
v___x_812_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_812_, 0, v___x_810_);
lean_ctor_set_uint8(v___x_812_, sizeof(void*)*1, v___x_811_);
return v___x_812_;
}
}
}
static lean_object* _init_lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__4(void){
_start:
{
lean_object* v___x_822_; lean_object* v___x_823_; 
v___x_822_ = lean_unsigned_to_nat(6u);
v___x_823_ = lean_nat_to_int(v___x_822_);
return v___x_823_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprRule_repr___redArg(lean_object* v_x_830_){
_start:
{
lean_object* v_id_831_; lean_object* v_head_832_; lean_object* v_body_833_; lean_object* v___x_834_; lean_object* v___x_835_; lean_object* v___x_836_; lean_object* v___x_837_; lean_object* v___x_838_; lean_object* v___x_839_; uint8_t v___x_840_; lean_object* v___x_841_; lean_object* v___x_842_; lean_object* v___x_843_; lean_object* v___x_844_; lean_object* v___x_845_; lean_object* v___x_846_; lean_object* v___x_847_; lean_object* v___x_848_; lean_object* v___x_849_; lean_object* v___x_850_; lean_object* v___x_851_; lean_object* v___x_852_; lean_object* v___x_853_; lean_object* v___x_854_; lean_object* v___x_855_; lean_object* v___x_856_; lean_object* v___x_857_; lean_object* v___x_858_; lean_object* v___x_859_; lean_object* v___x_860_; lean_object* v___x_861_; lean_object* v___x_862_; lean_object* v___x_863_; lean_object* v___x_864_; lean_object* v___x_865_; lean_object* v___x_866_; lean_object* v___x_867_; lean_object* v___x_868_; lean_object* v___x_869_; lean_object* v___x_870_; 
v_id_831_ = lean_ctor_get(v_x_830_, 0);
lean_inc_ref(v_id_831_);
v_head_832_ = lean_ctor_get(v_x_830_, 1);
lean_inc_ref(v_head_832_);
v_body_833_ = lean_ctor_get(v_x_830_, 2);
lean_inc(v_body_833_);
lean_dec_ref(v_x_830_);
v___x_834_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__5));
v___x_835_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__3));
v___x_836_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__4, &lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__4_once, _init_lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__4);
v___x_837_ = l_String_quote(v_id_831_);
v___x_838_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_838_, 0, v___x_837_);
v___x_839_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_839_, 0, v___x_836_);
lean_ctor_set(v___x_839_, 1, v___x_838_);
v___x_840_ = 0;
v___x_841_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_841_, 0, v___x_839_);
lean_ctor_set_uint8(v___x_841_, sizeof(void*)*1, v___x_840_);
v___x_842_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_842_, 0, v___x_835_);
lean_ctor_set(v___x_842_, 1, v___x_841_);
v___x_843_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Memory_instReprLiteral_repr_spec__0___redArg___closed__4));
v___x_844_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_844_, 0, v___x_842_);
lean_ctor_set(v___x_844_, 1, v___x_843_);
v___x_845_ = lean_box(1);
v___x_846_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_846_, 0, v___x_844_);
lean_ctor_set(v___x_846_, 1, v___x_845_);
v___x_847_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__6));
v___x_848_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_848_, 0, v___x_846_);
lean_ctor_set(v___x_848_, 1, v___x_847_);
v___x_849_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_849_, 0, v___x_848_);
lean_ctor_set(v___x_849_, 1, v___x_834_);
v___x_850_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg___closed__2, &lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg___closed__2_once, _init_lp_algalVerification_Algal_Memory_instReprTuple_repr___redArg___closed__2);
v___x_851_ = lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg(v_head_832_);
v___x_852_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_852_, 0, v___x_850_);
lean_ctor_set(v___x_852_, 1, v___x_851_);
v___x_853_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_853_, 0, v___x_852_);
lean_ctor_set_uint8(v___x_853_, sizeof(void*)*1, v___x_840_);
v___x_854_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_854_, 0, v___x_849_);
lean_ctor_set(v___x_854_, 1, v___x_853_);
v___x_855_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_855_, 0, v___x_854_);
lean_ctor_set(v___x_855_, 1, v___x_843_);
v___x_856_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_856_, 0, v___x_855_);
lean_ctor_set(v___x_856_, 1, v___x_845_);
v___x_857_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprRule_repr___redArg___closed__8));
v___x_858_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_858_, 0, v___x_856_);
lean_ctor_set(v___x_858_, 1, v___x_857_);
v___x_859_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_859_, 0, v___x_858_);
lean_ctor_set(v___x_859_, 1, v___x_834_);
v___x_860_ = lp_algalVerification_List_repr___at___00Algal_Memory_instReprRule_repr_spec__0___redArg(v_body_833_);
v___x_861_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_861_, 0, v___x_850_);
lean_ctor_set(v___x_861_, 1, v___x_860_);
v___x_862_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_862_, 0, v___x_861_);
lean_ctor_set_uint8(v___x_862_, sizeof(void*)*1, v___x_840_);
v___x_863_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_863_, 0, v___x_859_);
lean_ctor_set(v___x_863_, 1, v___x_862_);
v___x_864_ = lean_obj_once(&lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__13, &lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__13_once, _init_lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__13);
v___x_865_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__14));
v___x_866_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_866_, 0, v___x_865_);
lean_ctor_set(v___x_866_, 1, v___x_863_);
v___x_867_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instReprLiteral_repr___redArg___closed__15));
v___x_868_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_868_, 0, v___x_866_);
lean_ctor_set(v___x_868_, 1, v___x_867_);
v___x_869_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_869_, 0, v___x_864_);
lean_ctor_set(v___x_869_, 1, v___x_868_);
v___x_870_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_870_, 0, v___x_869_);
lean_ctor_set_uint8(v___x_870_, sizeof(void*)*1, v___x_840_);
return v___x_870_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprRule_repr(lean_object* v_x_871_, lean_object* v_prec_872_){
_start:
{
lean_object* v___x_873_; 
v___x_873_ = lp_algalVerification_Algal_Memory_instReprRule_repr___redArg(v_x_871_);
return v___x_873_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instReprRule_repr___boxed(lean_object* v_x_874_, lean_object* v_prec_875_){
_start:
{
lean_object* v_res_876_; 
v_res_876_ = lp_algalVerification_Algal_Memory_instReprRule_repr(v_x_874_, v_prec_875_);
lean_dec(v_prec_875_);
return v_res_876_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprRule_repr_spec__0(lean_object* v_a_877_, lean_object* v_n_878_){
_start:
{
lean_object* v___x_879_; 
v___x_879_ = lp_algalVerification_List_repr___at___00Algal_Memory_instReprRule_repr_spec__0___redArg(v_a_877_);
return v___x_879_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Memory_instReprRule_repr_spec__0___boxed(lean_object* v_a_880_, lean_object* v_n_881_){
_start:
{
lean_object* v_res_882_; 
v_res_882_ = lp_algalVerification_List_repr___at___00Algal_Memory_instReprRule_repr_spec__0(v_a_880_, v_n_881_);
lean_dec(v_n_881_);
return v_res_882_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_lookup(lean_object* v_x_885_, lean_object* v_x_886_){
_start:
{
if (lean_obj_tag(v_x_885_) == 0)
{
lean_object* v___x_887_; 
v___x_887_ = lean_box(0);
return v___x_887_;
}
else
{
lean_object* v_head_888_; lean_object* v_tail_889_; lean_object* v_fst_890_; lean_object* v_snd_891_; uint8_t v___x_892_; 
v_head_888_ = lean_ctor_get(v_x_885_, 0);
v_tail_889_ = lean_ctor_get(v_x_885_, 1);
v_fst_890_ = lean_ctor_get(v_head_888_, 0);
v_snd_891_ = lean_ctor_get(v_head_888_, 1);
v___x_892_ = lean_string_dec_eq(v_x_886_, v_fst_890_);
if (v___x_892_ == 0)
{
v_x_885_ = v_tail_889_;
goto _start;
}
else
{
lean_object* v___x_894_; 
lean_inc(v_snd_891_);
v___x_894_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_894_, 0, v_snd_891_);
return v___x_894_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_lookup___boxed(lean_object* v_x_895_, lean_object* v_x_896_){
_start:
{
lean_object* v_res_897_; 
v_res_897_ = lp_algalVerification_Algal_Memory_lookup(v_x_895_, v_x_896_);
lean_dec_ref(v_x_896_);
lean_dec(v_x_895_);
return v_res_897_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_lookup_match__1_splitter___redArg(lean_object* v_x_898_, lean_object* v_x_899_, lean_object* v_h__1_900_, lean_object* v_h__2_901_){
_start:
{
if (lean_obj_tag(v_x_898_) == 0)
{
lean_object* v___x_902_; 
lean_dec(v_h__2_901_);
v___x_902_ = lean_apply_1(v_h__1_900_, v_x_899_);
return v___x_902_;
}
else
{
lean_object* v_head_903_; lean_object* v_tail_904_; lean_object* v_fst_905_; lean_object* v_snd_906_; lean_object* v___x_907_; 
lean_dec(v_h__1_900_);
v_head_903_ = lean_ctor_get(v_x_898_, 0);
lean_inc(v_head_903_);
v_tail_904_ = lean_ctor_get(v_x_898_, 1);
lean_inc(v_tail_904_);
lean_dec_ref_known(v_x_898_, 2);
v_fst_905_ = lean_ctor_get(v_head_903_, 0);
lean_inc(v_fst_905_);
v_snd_906_ = lean_ctor_get(v_head_903_, 1);
lean_inc(v_snd_906_);
lean_dec(v_head_903_);
v___x_907_ = lean_apply_4(v_h__2_901_, v_fst_905_, v_snd_906_, v_tail_904_, v_x_899_);
return v___x_907_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_lookup_match__1_splitter(lean_object* v_motive_908_, lean_object* v_x_909_, lean_object* v_x_910_, lean_object* v_h__1_911_, lean_object* v_h__2_912_){
_start:
{
if (lean_obj_tag(v_x_909_) == 0)
{
lean_object* v___x_913_; 
lean_dec(v_h__2_912_);
v___x_913_ = lean_apply_1(v_h__1_911_, v_x_910_);
return v___x_913_;
}
else
{
lean_object* v_head_914_; lean_object* v_tail_915_; lean_object* v_fst_916_; lean_object* v_snd_917_; lean_object* v___x_918_; 
lean_dec(v_h__1_911_);
v_head_914_ = lean_ctor_get(v_x_909_, 0);
lean_inc(v_head_914_);
v_tail_915_ = lean_ctor_get(v_x_909_, 1);
lean_inc(v_tail_915_);
lean_dec_ref_known(v_x_909_, 2);
v_fst_916_ = lean_ctor_get(v_head_914_, 0);
lean_inc(v_fst_916_);
v_snd_917_ = lean_ctor_get(v_head_914_, 1);
lean_inc(v_snd_917_);
lean_dec(v_head_914_);
v___x_918_ = lean_apply_4(v_h__2_912_, v_fst_916_, v_snd_917_, v_tail_915_, v_x_910_);
return v___x_918_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instTerm(lean_object* v_00_u03c3_919_, lean_object* v_x_920_){
_start:
{
if (lean_obj_tag(v_x_920_) == 0)
{
lean_object* v_a_921_; lean_object* v___x_923_; uint8_t v_isShared_924_; uint8_t v_isSharedCheck_928_; 
v_a_921_ = lean_ctor_get(v_x_920_, 0);
v_isSharedCheck_928_ = !lean_is_exclusive(v_x_920_);
if (v_isSharedCheck_928_ == 0)
{
v___x_923_ = v_x_920_;
v_isShared_924_ = v_isSharedCheck_928_;
goto v_resetjp_922_;
}
else
{
lean_inc(v_a_921_);
lean_dec(v_x_920_);
v___x_923_ = lean_box(0);
v_isShared_924_ = v_isSharedCheck_928_;
goto v_resetjp_922_;
}
v_resetjp_922_:
{
lean_object* v___x_926_; 
if (v_isShared_924_ == 0)
{
lean_ctor_set_tag(v___x_923_, 1);
v___x_926_ = v___x_923_;
goto v_reusejp_925_;
}
else
{
lean_object* v_reuseFailAlloc_927_; 
v_reuseFailAlloc_927_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_927_, 0, v_a_921_);
v___x_926_ = v_reuseFailAlloc_927_;
goto v_reusejp_925_;
}
v_reusejp_925_:
{
return v___x_926_;
}
}
}
else
{
lean_object* v_a_929_; lean_object* v___x_930_; 
v_a_929_ = lean_ctor_get(v_x_920_, 0);
lean_inc_ref(v_a_929_);
lean_dec_ref_known(v_x_920_, 1);
v___x_930_ = lp_algalVerification_Algal_Memory_lookup(v_00_u03c3_919_, v_a_929_);
lean_dec_ref(v_a_929_);
return v___x_930_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instTerm___boxed(lean_object* v_00_u03c3_931_, lean_object* v_x_932_){
_start:
{
lean_object* v_res_933_; 
v_res_933_ = lp_algalVerification_Algal_Memory_instTerm(v_00_u03c3_931_, v_x_932_);
lean_dec(v_00_u03c3_931_);
return v_res_933_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_mapOpt___redArg(lean_object* v_f_936_, lean_object* v_x_937_){
_start:
{
if (lean_obj_tag(v_x_937_) == 0)
{
lean_object* v___x_938_; 
lean_dec_ref(v_f_936_);
v___x_938_ = ((lean_object*)(lp_algalVerification_Algal_Memory_mapOpt___redArg___closed__0));
return v___x_938_;
}
else
{
lean_object* v_head_939_; lean_object* v_tail_940_; lean_object* v___x_942_; uint8_t v_isShared_943_; uint8_t v_isSharedCheck_959_; 
v_head_939_ = lean_ctor_get(v_x_937_, 0);
v_tail_940_ = lean_ctor_get(v_x_937_, 1);
v_isSharedCheck_959_ = !lean_is_exclusive(v_x_937_);
if (v_isSharedCheck_959_ == 0)
{
v___x_942_ = v_x_937_;
v_isShared_943_ = v_isSharedCheck_959_;
goto v_resetjp_941_;
}
else
{
lean_inc(v_tail_940_);
lean_inc(v_head_939_);
lean_dec(v_x_937_);
v___x_942_ = lean_box(0);
v_isShared_943_ = v_isSharedCheck_959_;
goto v_resetjp_941_;
}
v_resetjp_941_:
{
lean_object* v___x_944_; 
lean_inc_ref(v_f_936_);
v___x_944_ = lean_apply_1(v_f_936_, v_head_939_);
if (lean_obj_tag(v___x_944_) == 0)
{
lean_object* v___x_945_; 
lean_del_object(v___x_942_);
lean_dec(v_tail_940_);
lean_dec_ref(v_f_936_);
v___x_945_ = lean_box(0);
return v___x_945_;
}
else
{
lean_object* v_val_946_; lean_object* v___x_947_; 
v_val_946_ = lean_ctor_get(v___x_944_, 0);
lean_inc(v_val_946_);
lean_dec_ref_known(v___x_944_, 1);
v___x_947_ = lp_algalVerification_Algal_Memory_mapOpt___redArg(v_f_936_, v_tail_940_);
if (lean_obj_tag(v___x_947_) == 0)
{
lean_dec(v_val_946_);
lean_del_object(v___x_942_);
return v___x_947_;
}
else
{
lean_object* v_val_948_; lean_object* v___x_950_; uint8_t v_isShared_951_; uint8_t v_isSharedCheck_958_; 
v_val_948_ = lean_ctor_get(v___x_947_, 0);
v_isSharedCheck_958_ = !lean_is_exclusive(v___x_947_);
if (v_isSharedCheck_958_ == 0)
{
v___x_950_ = v___x_947_;
v_isShared_951_ = v_isSharedCheck_958_;
goto v_resetjp_949_;
}
else
{
lean_inc(v_val_948_);
lean_dec(v___x_947_);
v___x_950_ = lean_box(0);
v_isShared_951_ = v_isSharedCheck_958_;
goto v_resetjp_949_;
}
v_resetjp_949_:
{
lean_object* v___x_953_; 
if (v_isShared_943_ == 0)
{
lean_ctor_set(v___x_942_, 1, v_val_948_);
lean_ctor_set(v___x_942_, 0, v_val_946_);
v___x_953_ = v___x_942_;
goto v_reusejp_952_;
}
else
{
lean_object* v_reuseFailAlloc_957_; 
v_reuseFailAlloc_957_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_957_, 0, v_val_946_);
lean_ctor_set(v_reuseFailAlloc_957_, 1, v_val_948_);
v___x_953_ = v_reuseFailAlloc_957_;
goto v_reusejp_952_;
}
v_reusejp_952_:
{
lean_object* v___x_955_; 
if (v_isShared_951_ == 0)
{
lean_ctor_set(v___x_950_, 0, v___x_953_);
v___x_955_ = v___x_950_;
goto v_reusejp_954_;
}
else
{
lean_object* v_reuseFailAlloc_956_; 
v_reuseFailAlloc_956_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_956_, 0, v___x_953_);
v___x_955_ = v_reuseFailAlloc_956_;
goto v_reusejp_954_;
}
v_reusejp_954_:
{
return v___x_955_;
}
}
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_mapOpt(lean_object* v_00_u03b1_960_, lean_object* v_00_u03b2_961_, lean_object* v_f_962_, lean_object* v_x_963_){
_start:
{
lean_object* v___x_964_; 
v___x_964_ = lp_algalVerification_Algal_Memory_mapOpt___redArg(v_f_962_, v_x_963_);
return v___x_964_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_mapOpt_match__5_splitter___redArg(lean_object* v_x_965_, lean_object* v_h__1_966_, lean_object* v_h__2_967_){
_start:
{
if (lean_obj_tag(v_x_965_) == 0)
{
lean_object* v___x_968_; lean_object* v___x_969_; 
lean_dec(v_h__2_967_);
v___x_968_ = lean_box(0);
v___x_969_ = lean_apply_1(v_h__1_966_, v___x_968_);
return v___x_969_;
}
else
{
lean_object* v_head_970_; lean_object* v_tail_971_; lean_object* v___x_972_; 
lean_dec(v_h__1_966_);
v_head_970_ = lean_ctor_get(v_x_965_, 0);
lean_inc(v_head_970_);
v_tail_971_ = lean_ctor_get(v_x_965_, 1);
lean_inc(v_tail_971_);
lean_dec_ref_known(v_x_965_, 2);
v___x_972_ = lean_apply_2(v_h__2_967_, v_head_970_, v_tail_971_);
return v___x_972_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_mapOpt_match__5_splitter(lean_object* v_00_u03b1_973_, lean_object* v_motive_974_, lean_object* v_x_975_, lean_object* v_h__1_976_, lean_object* v_h__2_977_){
_start:
{
if (lean_obj_tag(v_x_975_) == 0)
{
lean_object* v___x_978_; lean_object* v___x_979_; 
lean_dec(v_h__2_977_);
v___x_978_ = lean_box(0);
v___x_979_ = lean_apply_1(v_h__1_976_, v___x_978_);
return v___x_979_;
}
else
{
lean_object* v_head_980_; lean_object* v_tail_981_; lean_object* v___x_982_; 
lean_dec(v_h__1_976_);
v_head_980_ = lean_ctor_get(v_x_975_, 0);
lean_inc(v_head_980_);
v_tail_981_ = lean_ctor_get(v_x_975_, 1);
lean_inc(v_tail_981_);
lean_dec_ref_known(v_x_975_, 2);
v___x_982_ = lean_apply_2(v_h__2_977_, v_head_980_, v_tail_981_);
return v___x_982_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_mapOpt_match__3_splitter___redArg(lean_object* v_x_983_, lean_object* v_h__1_984_, lean_object* v_h__2_985_){
_start:
{
if (lean_obj_tag(v_x_983_) == 0)
{
lean_object* v___x_986_; lean_object* v___x_987_; 
lean_dec(v_h__2_985_);
v___x_986_ = lean_box(0);
v___x_987_ = lean_apply_1(v_h__1_984_, v___x_986_);
return v___x_987_;
}
else
{
lean_object* v_val_988_; lean_object* v___x_989_; 
lean_dec(v_h__1_984_);
v_val_988_ = lean_ctor_get(v_x_983_, 0);
lean_inc(v_val_988_);
lean_dec_ref_known(v_x_983_, 1);
v___x_989_ = lean_apply_1(v_h__2_985_, v_val_988_);
return v___x_989_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_mapOpt_match__3_splitter(lean_object* v_00_u03b2_990_, lean_object* v_motive_991_, lean_object* v_x_992_, lean_object* v_h__1_993_, lean_object* v_h__2_994_){
_start:
{
if (lean_obj_tag(v_x_992_) == 0)
{
lean_object* v___x_995_; lean_object* v___x_996_; 
lean_dec(v_h__2_994_);
v___x_995_ = lean_box(0);
v___x_996_ = lean_apply_1(v_h__1_993_, v___x_995_);
return v___x_996_;
}
else
{
lean_object* v_val_997_; lean_object* v___x_998_; 
lean_dec(v_h__1_993_);
v_val_997_ = lean_ctor_get(v_x_992_, 0);
lean_inc(v_val_997_);
lean_dec_ref_known(v_x_992_, 1);
v___x_998_ = lean_apply_1(v_h__2_994_, v_val_997_);
return v___x_998_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_mapOpt_match__1_splitter___redArg(lean_object* v_x_999_, lean_object* v_h__1_1000_, lean_object* v_h__2_1001_){
_start:
{
if (lean_obj_tag(v_x_999_) == 0)
{
lean_object* v___x_1002_; lean_object* v___x_1003_; 
lean_dec(v_h__2_1001_);
v___x_1002_ = lean_box(0);
v___x_1003_ = lean_apply_1(v_h__1_1000_, v___x_1002_);
return v___x_1003_;
}
else
{
lean_object* v_val_1004_; lean_object* v___x_1005_; 
lean_dec(v_h__1_1000_);
v_val_1004_ = lean_ctor_get(v_x_999_, 0);
lean_inc(v_val_1004_);
lean_dec_ref_known(v_x_999_, 1);
v___x_1005_ = lean_apply_1(v_h__2_1001_, v_val_1004_);
return v___x_1005_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_mapOpt_match__1_splitter(lean_object* v_00_u03b2_1006_, lean_object* v_motive_1007_, lean_object* v_x_1008_, lean_object* v_h__1_1009_, lean_object* v_h__2_1010_){
_start:
{
if (lean_obj_tag(v_x_1008_) == 0)
{
lean_object* v___x_1011_; lean_object* v___x_1012_; 
lean_dec(v_h__2_1010_);
v___x_1011_ = lean_box(0);
v___x_1012_ = lean_apply_1(v_h__1_1009_, v___x_1011_);
return v___x_1012_;
}
else
{
lean_object* v_val_1013_; lean_object* v___x_1014_; 
lean_dec(v_h__1_1009_);
v_val_1013_ = lean_ctor_get(v_x_1008_, 0);
lean_inc(v_val_1013_);
lean_dec_ref_known(v_x_1008_, 1);
v___x_1014_ = lean_apply_1(v_h__2_1010_, v_val_1013_);
return v___x_1014_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instArgs(lean_object* v_00_u03c3_1015_, lean_object* v_ts_1016_){
_start:
{
lean_object* v___x_1017_; lean_object* v___x_1018_; 
v___x_1017_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Memory_instTerm___boxed), 2, 1);
lean_closure_set(v___x_1017_, 0, v_00_u03c3_1015_);
v___x_1018_ = lp_algalVerification_Algal_Memory_mapOpt___redArg(v___x_1017_, v_ts_1016_);
return v___x_1018_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instLit(lean_object* v_00_u03c3_1019_, lean_object* v_l_1020_){
_start:
{
lean_object* v_relation_1021_; lean_object* v_terms_1022_; lean_object* v___x_1024_; uint8_t v_isShared_1025_; uint8_t v_isSharedCheck_1039_; 
v_relation_1021_ = lean_ctor_get(v_l_1020_, 0);
v_terms_1022_ = lean_ctor_get(v_l_1020_, 1);
v_isSharedCheck_1039_ = !lean_is_exclusive(v_l_1020_);
if (v_isSharedCheck_1039_ == 0)
{
v___x_1024_ = v_l_1020_;
v_isShared_1025_ = v_isSharedCheck_1039_;
goto v_resetjp_1023_;
}
else
{
lean_inc(v_terms_1022_);
lean_inc(v_relation_1021_);
lean_dec(v_l_1020_);
v___x_1024_ = lean_box(0);
v_isShared_1025_ = v_isSharedCheck_1039_;
goto v_resetjp_1023_;
}
v_resetjp_1023_:
{
lean_object* v___x_1026_; 
v___x_1026_ = lp_algalVerification_Algal_Memory_instArgs(v_00_u03c3_1019_, v_terms_1022_);
if (lean_obj_tag(v___x_1026_) == 0)
{
lean_object* v___x_1027_; 
lean_del_object(v___x_1024_);
lean_dec_ref(v_relation_1021_);
v___x_1027_ = lean_box(0);
return v___x_1027_;
}
else
{
lean_object* v_val_1028_; lean_object* v___x_1030_; uint8_t v_isShared_1031_; uint8_t v_isSharedCheck_1038_; 
v_val_1028_ = lean_ctor_get(v___x_1026_, 0);
v_isSharedCheck_1038_ = !lean_is_exclusive(v___x_1026_);
if (v_isSharedCheck_1038_ == 0)
{
v___x_1030_ = v___x_1026_;
v_isShared_1031_ = v_isSharedCheck_1038_;
goto v_resetjp_1029_;
}
else
{
lean_inc(v_val_1028_);
lean_dec(v___x_1026_);
v___x_1030_ = lean_box(0);
v_isShared_1031_ = v_isSharedCheck_1038_;
goto v_resetjp_1029_;
}
v_resetjp_1029_:
{
lean_object* v___x_1033_; 
if (v_isShared_1025_ == 0)
{
lean_ctor_set(v___x_1024_, 1, v_val_1028_);
v___x_1033_ = v___x_1024_;
goto v_reusejp_1032_;
}
else
{
lean_object* v_reuseFailAlloc_1037_; 
v_reuseFailAlloc_1037_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1037_, 0, v_relation_1021_);
lean_ctor_set(v_reuseFailAlloc_1037_, 1, v_val_1028_);
v___x_1033_ = v_reuseFailAlloc_1037_;
goto v_reusejp_1032_;
}
v_reusejp_1032_:
{
lean_object* v___x_1035_; 
if (v_isShared_1031_ == 0)
{
lean_ctor_set(v___x_1030_, 0, v___x_1033_);
v___x_1035_ = v___x_1030_;
goto v_reusejp_1034_;
}
else
{
lean_object* v_reuseFailAlloc_1036_; 
v_reuseFailAlloc_1036_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1036_, 0, v___x_1033_);
v___x_1035_ = v_reuseFailAlloc_1036_;
goto v_reusejp_1034_;
}
v_reusejp_1034_:
{
return v___x_1035_;
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_instLit_match__1_splitter___redArg(lean_object* v_x_1040_, lean_object* v_h__1_1041_, lean_object* v_h__2_1042_){
_start:
{
if (lean_obj_tag(v_x_1040_) == 0)
{
lean_object* v___x_1043_; lean_object* v___x_1044_; 
lean_dec(v_h__1_1041_);
v___x_1043_ = lean_box(0);
v___x_1044_ = lean_apply_1(v_h__2_1042_, v___x_1043_);
return v___x_1044_;
}
else
{
lean_object* v_val_1045_; lean_object* v___x_1046_; 
lean_dec(v_h__2_1042_);
v_val_1045_ = lean_ctor_get(v_x_1040_, 0);
lean_inc(v_val_1045_);
lean_dec_ref_known(v_x_1040_, 1);
v___x_1046_ = lean_apply_1(v_h__1_1041_, v_val_1045_);
return v___x_1046_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_instLit_match__1_splitter(lean_object* v_motive_1047_, lean_object* v_x_1048_, lean_object* v_h__1_1049_, lean_object* v_h__2_1050_){
_start:
{
if (lean_obj_tag(v_x_1048_) == 0)
{
lean_object* v___x_1051_; lean_object* v___x_1052_; 
lean_dec(v_h__1_1049_);
v___x_1051_ = lean_box(0);
v___x_1052_ = lean_apply_1(v_h__2_1050_, v___x_1051_);
return v___x_1052_;
}
else
{
lean_object* v_val_1053_; lean_object* v___x_1054_; 
lean_dec(v_h__2_1050_);
v_val_1053_ = lean_ctor_get(v_x_1048_, 0);
lean_inc(v_val_1053_);
lean_dec_ref_known(v_x_1048_, 1);
v___x_1054_ = lean_apply_1(v_h__1_1049_, v_val_1053_);
return v___x_1054_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_termVars(lean_object* v_x_1055_){
_start:
{
if (lean_obj_tag(v_x_1055_) == 0)
{
lean_object* v___x_1056_; 
v___x_1056_ = lean_box(0);
return v___x_1056_;
}
else
{
lean_object* v_a_1057_; lean_object* v___x_1058_; lean_object* v___x_1059_; 
v_a_1057_ = lean_ctor_get(v_x_1055_, 0);
v___x_1058_ = lean_box(0);
lean_inc_ref(v_a_1057_);
v___x_1059_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1059_, 0, v_a_1057_);
lean_ctor_set(v___x_1059_, 1, v___x_1058_);
return v___x_1059_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_termVars___boxed(lean_object* v_x_1060_){
_start:
{
lean_object* v_res_1061_; 
v_res_1061_ = lp_algalVerification_Algal_Memory_termVars(v_x_1060_);
lean_dec_ref(v_x_1060_);
return v_res_1061_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_litVars_spec__0(lean_object* v_a_1062_, lean_object* v_a_1063_){
_start:
{
if (lean_obj_tag(v_a_1062_) == 0)
{
lean_object* v___x_1064_; 
v___x_1064_ = lean_array_to_list(v_a_1063_);
return v___x_1064_;
}
else
{
lean_object* v_head_1065_; lean_object* v_tail_1066_; lean_object* v___x_1067_; lean_object* v___x_1068_; 
v_head_1065_ = lean_ctor_get(v_a_1062_, 0);
v_tail_1066_ = lean_ctor_get(v_a_1062_, 1);
v___x_1067_ = lp_algalVerification_Algal_Memory_termVars(v_head_1065_);
v___x_1068_ = l_List_foldl___at___00Array_appendList_spec__0___redArg(v_a_1063_, v___x_1067_);
v_a_1062_ = v_tail_1066_;
v_a_1063_ = v___x_1068_;
goto _start;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_litVars_spec__0___boxed(lean_object* v_a_1070_, lean_object* v_a_1071_){
_start:
{
lean_object* v_res_1072_; 
v_res_1072_ = lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_litVars_spec__0(v_a_1070_, v_a_1071_);
lean_dec(v_a_1070_);
return v_res_1072_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_litVars(lean_object* v_l_1075_){
_start:
{
lean_object* v_terms_1076_; lean_object* v___x_1077_; lean_object* v___x_1078_; 
v_terms_1076_ = lean_ctor_get(v_l_1075_, 1);
v___x_1077_ = ((lean_object*)(lp_algalVerification_Algal_Memory_litVars___closed__0));
v___x_1078_ = lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_litVars_spec__0(v_terms_1076_, v___x_1077_);
return v___x_1078_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_litVars___boxed(lean_object* v_l_1079_){
_start:
{
lean_object* v_res_1080_; 
v_res_1080_ = lp_algalVerification_Algal_Memory_litVars(v_l_1079_);
lean_dec_ref(v_l_1079_);
return v_res_1080_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_bodyVars_spec__0(lean_object* v_a_1081_, lean_object* v_a_1082_){
_start:
{
if (lean_obj_tag(v_a_1081_) == 0)
{
lean_object* v___x_1083_; 
v___x_1083_ = lean_array_to_list(v_a_1082_);
return v___x_1083_;
}
else
{
lean_object* v_head_1084_; lean_object* v_tail_1085_; lean_object* v___x_1086_; lean_object* v___x_1087_; 
v_head_1084_ = lean_ctor_get(v_a_1081_, 0);
v_tail_1085_ = lean_ctor_get(v_a_1081_, 1);
v___x_1086_ = lp_algalVerification_Algal_Memory_litVars(v_head_1084_);
v___x_1087_ = l_List_foldl___at___00Array_appendList_spec__0___redArg(v_a_1082_, v___x_1086_);
v_a_1081_ = v_tail_1085_;
v_a_1082_ = v___x_1087_;
goto _start;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_bodyVars_spec__0___boxed(lean_object* v_a_1089_, lean_object* v_a_1090_){
_start:
{
lean_object* v_res_1091_; 
v_res_1091_ = lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_bodyVars_spec__0(v_a_1089_, v_a_1090_);
lean_dec(v_a_1089_);
return v_res_1091_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_bodyVars(lean_object* v_r_1092_){
_start:
{
lean_object* v_body_1093_; lean_object* v___x_1094_; lean_object* v___x_1095_; 
v_body_1093_ = lean_ctor_get(v_r_1092_, 2);
v___x_1094_ = ((lean_object*)(lp_algalVerification_Algal_Memory_litVars___closed__0));
v___x_1095_ = lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_bodyVars_spec__0(v_body_1093_, v___x_1094_);
return v___x_1095_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_bodyVars___boxed(lean_object* v_r_1096_){
_start:
{
lean_object* v_res_1097_; 
v_res_1097_ = lp_algalVerification_Algal_Memory_bodyVars(v_r_1096_);
lean_dec_ref(v_r_1096_);
return v_res_1097_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_instReprTerm_repr_match__1_splitter___redArg(lean_object* v_x_1098_, lean_object* v_h__1_1099_, lean_object* v_h__2_1100_){
_start:
{
if (lean_obj_tag(v_x_1098_) == 0)
{
lean_object* v_a_1101_; lean_object* v___x_1102_; 
lean_dec(v_h__2_1100_);
v_a_1101_ = lean_ctor_get(v_x_1098_, 0);
lean_inc(v_a_1101_);
lean_dec_ref_known(v_x_1098_, 1);
v___x_1102_ = lean_apply_1(v_h__1_1099_, v_a_1101_);
return v___x_1102_;
}
else
{
lean_object* v_a_1103_; lean_object* v___x_1104_; 
lean_dec(v_h__1_1099_);
v_a_1103_ = lean_ctor_get(v_x_1098_, 0);
lean_inc_ref(v_a_1103_);
lean_dec_ref_known(v_x_1098_, 1);
v___x_1104_ = lean_apply_1(v_h__2_1100_, v_a_1103_);
return v___x_1104_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_instReprTerm_repr_match__1_splitter(lean_object* v_motive_1105_, lean_object* v_x_1106_, lean_object* v_h__1_1107_, lean_object* v_h__2_1108_){
_start:
{
if (lean_obj_tag(v_x_1106_) == 0)
{
lean_object* v_a_1109_; lean_object* v___x_1110_; 
lean_dec(v_h__2_1108_);
v_a_1109_ = lean_ctor_get(v_x_1106_, 0);
lean_inc(v_a_1109_);
lean_dec_ref_known(v_x_1106_, 1);
v___x_1110_ = lean_apply_1(v_h__1_1107_, v_a_1109_);
return v___x_1110_;
}
else
{
lean_object* v_a_1111_; lean_object* v___x_1112_; 
lean_dec(v_h__1_1107_);
v_a_1111_ = lean_ctor_get(v_x_1106_, 0);
lean_inc_ref(v_a_1111_);
lean_dec_ref_known(v_x_1106_, 1);
v___x_1112_ = lean_apply_1(v_h__2_1108_, v_a_1111_);
return v___x_1112_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_matchTerm(lean_object* v_00_u03c3_1113_, lean_object* v_t_1114_, lean_object* v_a_1115_){
_start:
{
lean_object* v_c_1117_; 
if (lean_obj_tag(v_t_1114_) == 0)
{
lean_object* v_a_1121_; 
v_a_1121_ = lean_ctor_get(v_t_1114_, 0);
lean_inc(v_a_1121_);
lean_dec_ref_known(v_t_1114_, 1);
v_c_1117_ = v_a_1121_;
goto v___jp_1116_;
}
else
{
lean_object* v_a_1122_; lean_object* v___x_1124_; uint8_t v_isShared_1125_; uint8_t v_isSharedCheck_1133_; 
v_a_1122_ = lean_ctor_get(v_t_1114_, 0);
v_isSharedCheck_1133_ = !lean_is_exclusive(v_t_1114_);
if (v_isSharedCheck_1133_ == 0)
{
v___x_1124_ = v_t_1114_;
v_isShared_1125_ = v_isSharedCheck_1133_;
goto v_resetjp_1123_;
}
else
{
lean_inc(v_a_1122_);
lean_dec(v_t_1114_);
v___x_1124_ = lean_box(0);
v_isShared_1125_ = v_isSharedCheck_1133_;
goto v_resetjp_1123_;
}
v_resetjp_1123_:
{
lean_object* v___x_1126_; 
v___x_1126_ = lp_algalVerification_Algal_Memory_lookup(v_00_u03c3_1113_, v_a_1122_);
if (lean_obj_tag(v___x_1126_) == 0)
{
lean_object* v___x_1127_; lean_object* v___x_1128_; lean_object* v___x_1130_; 
v___x_1127_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1127_, 0, v_a_1122_);
lean_ctor_set(v___x_1127_, 1, v_a_1115_);
v___x_1128_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1128_, 0, v___x_1127_);
lean_ctor_set(v___x_1128_, 1, v_00_u03c3_1113_);
if (v_isShared_1125_ == 0)
{
lean_ctor_set(v___x_1124_, 0, v___x_1128_);
v___x_1130_ = v___x_1124_;
goto v_reusejp_1129_;
}
else
{
lean_object* v_reuseFailAlloc_1131_; 
v_reuseFailAlloc_1131_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1131_, 0, v___x_1128_);
v___x_1130_ = v_reuseFailAlloc_1131_;
goto v_reusejp_1129_;
}
v_reusejp_1129_:
{
return v___x_1130_;
}
}
else
{
lean_object* v_val_1132_; 
lean_del_object(v___x_1124_);
lean_dec_ref(v_a_1122_);
v_val_1132_ = lean_ctor_get(v___x_1126_, 0);
lean_inc(v_val_1132_);
lean_dec_ref_known(v___x_1126_, 1);
v_c_1117_ = v_val_1132_;
goto v___jp_1116_;
}
}
}
v___jp_1116_:
{
uint8_t v___x_1118_; 
v___x_1118_ = lp_algalVerification_Algal_Memory_instDecidableEqAtom_decEq(v_c_1117_, v_a_1115_);
lean_dec(v_a_1115_);
lean_dec(v_c_1117_);
if (v___x_1118_ == 0)
{
lean_object* v___x_1119_; 
lean_dec(v_00_u03c3_1113_);
v___x_1119_ = lean_box(0);
return v___x_1119_;
}
else
{
lean_object* v___x_1120_; 
v___x_1120_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_1120_, 0, v_00_u03c3_1113_);
return v___x_1120_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_matchTerm_match__1_splitter___redArg(lean_object* v_x_1134_, lean_object* v_h__1_1135_, lean_object* v_h__2_1136_){
_start:
{
if (lean_obj_tag(v_x_1134_) == 0)
{
lean_object* v___x_1137_; lean_object* v___x_1138_; 
lean_dec(v_h__1_1135_);
v___x_1137_ = lean_box(0);
v___x_1138_ = lean_apply_1(v_h__2_1136_, v___x_1137_);
return v___x_1138_;
}
else
{
lean_object* v_val_1139_; lean_object* v___x_1140_; 
lean_dec(v_h__2_1136_);
v_val_1139_ = lean_ctor_get(v_x_1134_, 0);
lean_inc(v_val_1139_);
lean_dec_ref_known(v_x_1134_, 1);
v___x_1140_ = lean_apply_1(v_h__1_1135_, v_val_1139_);
return v___x_1140_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_matchTerm_match__1_splitter(lean_object* v_motive_1141_, lean_object* v_x_1142_, lean_object* v_h__1_1143_, lean_object* v_h__2_1144_){
_start:
{
if (lean_obj_tag(v_x_1142_) == 0)
{
lean_object* v___x_1145_; lean_object* v___x_1146_; 
lean_dec(v_h__1_1143_);
v___x_1145_ = lean_box(0);
v___x_1146_ = lean_apply_1(v_h__2_1144_, v___x_1145_);
return v___x_1146_;
}
else
{
lean_object* v_val_1147_; lean_object* v___x_1148_; 
lean_dec(v_h__2_1144_);
v_val_1147_ = lean_ctor_get(v_x_1142_, 0);
lean_inc(v_val_1147_);
lean_dec_ref_known(v_x_1142_, 1);
v___x_1148_ = lean_apply_1(v_h__1_1143_, v_val_1147_);
return v___x_1148_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_matchArgs(lean_object* v_00_u03c3_1149_, lean_object* v_x_1150_, lean_object* v_x_1151_){
_start:
{
if (lean_obj_tag(v_x_1150_) == 0)
{
if (lean_obj_tag(v_x_1151_) == 0)
{
lean_object* v___x_1152_; 
v___x_1152_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_1152_, 0, v_00_u03c3_1149_);
return v___x_1152_;
}
else
{
lean_object* v___x_1153_; 
lean_dec(v_x_1151_);
lean_dec(v_00_u03c3_1149_);
v___x_1153_ = lean_box(0);
return v___x_1153_;
}
}
else
{
if (lean_obj_tag(v_x_1151_) == 1)
{
lean_object* v_head_1154_; lean_object* v_tail_1155_; lean_object* v_head_1156_; lean_object* v_tail_1157_; lean_object* v___x_1158_; 
v_head_1154_ = lean_ctor_get(v_x_1150_, 0);
lean_inc(v_head_1154_);
v_tail_1155_ = lean_ctor_get(v_x_1150_, 1);
lean_inc(v_tail_1155_);
lean_dec_ref_known(v_x_1150_, 2);
v_head_1156_ = lean_ctor_get(v_x_1151_, 0);
lean_inc(v_head_1156_);
v_tail_1157_ = lean_ctor_get(v_x_1151_, 1);
lean_inc(v_tail_1157_);
lean_dec_ref_known(v_x_1151_, 2);
v___x_1158_ = lp_algalVerification_Algal_Memory_matchTerm(v_00_u03c3_1149_, v_head_1154_, v_head_1156_);
if (lean_obj_tag(v___x_1158_) == 0)
{
lean_dec(v_tail_1157_);
lean_dec(v_tail_1155_);
return v___x_1158_;
}
else
{
lean_object* v_val_1159_; 
v_val_1159_ = lean_ctor_get(v___x_1158_, 0);
lean_inc(v_val_1159_);
lean_dec_ref_known(v___x_1158_, 1);
v_00_u03c3_1149_ = v_val_1159_;
v_x_1150_ = v_tail_1155_;
v_x_1151_ = v_tail_1157_;
goto _start;
}
}
else
{
lean_object* v___x_1161_; 
lean_dec_ref_known(v_x_1150_, 2);
lean_dec(v_x_1151_);
lean_dec(v_00_u03c3_1149_);
v___x_1161_ = lean_box(0);
return v___x_1161_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_matchArgs_match__3_splitter___redArg(lean_object* v_x_1162_, lean_object* v_x_1163_, lean_object* v_h__1_1164_, lean_object* v_h__2_1165_, lean_object* v_h__3_1166_){
_start:
{
if (lean_obj_tag(v_x_1162_) == 0)
{
lean_dec(v_h__2_1165_);
if (lean_obj_tag(v_x_1163_) == 0)
{
lean_object* v___x_1167_; lean_object* v___x_1168_; 
lean_dec(v_h__3_1166_);
v___x_1167_ = lean_box(0);
v___x_1168_ = lean_apply_1(v_h__1_1164_, v___x_1167_);
return v___x_1168_;
}
else
{
lean_object* v___x_1169_; 
lean_dec(v_h__1_1164_);
v___x_1169_ = lean_apply_4(v_h__3_1166_, v_x_1162_, v_x_1163_, lean_box(0), lean_box(0));
return v___x_1169_;
}
}
else
{
lean_dec(v_h__1_1164_);
if (lean_obj_tag(v_x_1163_) == 1)
{
lean_object* v_head_1170_; lean_object* v_tail_1171_; lean_object* v_head_1172_; lean_object* v_tail_1173_; lean_object* v___x_1174_; 
lean_dec(v_h__3_1166_);
v_head_1170_ = lean_ctor_get(v_x_1162_, 0);
lean_inc(v_head_1170_);
v_tail_1171_ = lean_ctor_get(v_x_1162_, 1);
lean_inc(v_tail_1171_);
lean_dec_ref_known(v_x_1162_, 2);
v_head_1172_ = lean_ctor_get(v_x_1163_, 0);
lean_inc(v_head_1172_);
v_tail_1173_ = lean_ctor_get(v_x_1163_, 1);
lean_inc(v_tail_1173_);
lean_dec_ref_known(v_x_1163_, 2);
v___x_1174_ = lean_apply_4(v_h__2_1165_, v_head_1170_, v_tail_1171_, v_head_1172_, v_tail_1173_);
return v___x_1174_;
}
else
{
lean_object* v___x_1175_; 
lean_dec(v_h__2_1165_);
v___x_1175_ = lean_apply_4(v_h__3_1166_, v_x_1162_, v_x_1163_, lean_box(0), lean_box(0));
return v___x_1175_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_matchArgs_match__3_splitter(lean_object* v_motive_1176_, lean_object* v_x_1177_, lean_object* v_x_1178_, lean_object* v_h__1_1179_, lean_object* v_h__2_1180_, lean_object* v_h__3_1181_){
_start:
{
if (lean_obj_tag(v_x_1177_) == 0)
{
lean_dec(v_h__2_1180_);
if (lean_obj_tag(v_x_1178_) == 0)
{
lean_object* v___x_1182_; lean_object* v___x_1183_; 
lean_dec(v_h__3_1181_);
v___x_1182_ = lean_box(0);
v___x_1183_ = lean_apply_1(v_h__1_1179_, v___x_1182_);
return v___x_1183_;
}
else
{
lean_object* v___x_1184_; 
lean_dec(v_h__1_1179_);
v___x_1184_ = lean_apply_4(v_h__3_1181_, v_x_1177_, v_x_1178_, lean_box(0), lean_box(0));
return v___x_1184_;
}
}
else
{
lean_dec(v_h__1_1179_);
if (lean_obj_tag(v_x_1178_) == 1)
{
lean_object* v_head_1185_; lean_object* v_tail_1186_; lean_object* v_head_1187_; lean_object* v_tail_1188_; lean_object* v___x_1189_; 
lean_dec(v_h__3_1181_);
v_head_1185_ = lean_ctor_get(v_x_1177_, 0);
lean_inc(v_head_1185_);
v_tail_1186_ = lean_ctor_get(v_x_1177_, 1);
lean_inc(v_tail_1186_);
lean_dec_ref_known(v_x_1177_, 2);
v_head_1187_ = lean_ctor_get(v_x_1178_, 0);
lean_inc(v_head_1187_);
v_tail_1188_ = lean_ctor_get(v_x_1178_, 1);
lean_inc(v_tail_1188_);
lean_dec_ref_known(v_x_1178_, 2);
v___x_1189_ = lean_apply_4(v_h__2_1180_, v_head_1185_, v_tail_1186_, v_head_1187_, v_tail_1188_);
return v___x_1189_;
}
else
{
lean_object* v___x_1190_; 
lean_dec(v_h__2_1180_);
v___x_1190_ = lean_apply_4(v_h__3_1181_, v_x_1177_, v_x_1178_, lean_box(0), lean_box(0));
return v___x_1190_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_matchArgs_match__1_splitter___redArg(lean_object* v_x_1191_, lean_object* v_h__1_1192_, lean_object* v_h__2_1193_){
_start:
{
if (lean_obj_tag(v_x_1191_) == 0)
{
lean_object* v___x_1194_; lean_object* v___x_1195_; 
lean_dec(v_h__2_1193_);
v___x_1194_ = lean_box(0);
v___x_1195_ = lean_apply_1(v_h__1_1192_, v___x_1194_);
return v___x_1195_;
}
else
{
lean_object* v_val_1196_; lean_object* v___x_1197_; 
lean_dec(v_h__1_1192_);
v_val_1196_ = lean_ctor_get(v_x_1191_, 0);
lean_inc(v_val_1196_);
lean_dec_ref_known(v_x_1191_, 1);
v___x_1197_ = lean_apply_1(v_h__2_1193_, v_val_1196_);
return v___x_1197_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_matchArgs_match__1_splitter(lean_object* v_motive_1198_, lean_object* v_x_1199_, lean_object* v_h__1_1200_, lean_object* v_h__2_1201_){
_start:
{
if (lean_obj_tag(v_x_1199_) == 0)
{
lean_object* v___x_1202_; lean_object* v___x_1203_; 
lean_dec(v_h__2_1201_);
v___x_1202_ = lean_box(0);
v___x_1203_ = lean_apply_1(v_h__1_1200_, v___x_1202_);
return v___x_1203_;
}
else
{
lean_object* v_val_1204_; lean_object* v___x_1205_; 
lean_dec(v_h__1_1200_);
v_val_1204_ = lean_ctor_get(v_x_1199_, 0);
lean_inc(v_val_1204_);
lean_dec_ref_known(v_x_1199_, 1);
v___x_1205_ = lean_apply_1(v_h__2_1201_, v_val_1204_);
return v___x_1205_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_matchLit(lean_object* v_00_u03c3_1206_, lean_object* v_l_1207_, lean_object* v_t_1208_){
_start:
{
lean_object* v_relation_1209_; lean_object* v_terms_1210_; lean_object* v_relation_1211_; lean_object* v_args_1212_; uint8_t v___x_1213_; 
v_relation_1209_ = lean_ctor_get(v_l_1207_, 0);
lean_inc_ref(v_relation_1209_);
v_terms_1210_ = lean_ctor_get(v_l_1207_, 1);
lean_inc(v_terms_1210_);
lean_dec_ref(v_l_1207_);
v_relation_1211_ = lean_ctor_get(v_t_1208_, 0);
lean_inc_ref(v_relation_1211_);
v_args_1212_ = lean_ctor_get(v_t_1208_, 1);
lean_inc(v_args_1212_);
lean_dec_ref(v_t_1208_);
v___x_1213_ = lean_string_dec_eq(v_relation_1209_, v_relation_1211_);
lean_dec_ref(v_relation_1211_);
lean_dec_ref(v_relation_1209_);
if (v___x_1213_ == 0)
{
lean_object* v___x_1214_; 
lean_dec(v_args_1212_);
lean_dec(v_terms_1210_);
lean_dec(v_00_u03c3_1206_);
v___x_1214_ = lean_box(0);
return v___x_1214_;
}
else
{
lean_object* v___x_1215_; 
v___x_1215_ = lp_algalVerification_Algal_Memory_matchArgs(v_00_u03c3_1206_, v_terms_1210_, v_args_1212_);
return v___x_1215_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_filterMapTR_go___at___00Algal_Memory_joinLit_spec__0(lean_object* v_00_u03c3_1216_, lean_object* v_l_1217_, lean_object* v_a_1218_, lean_object* v_a_1219_){
_start:
{
if (lean_obj_tag(v_a_1218_) == 0)
{
lean_object* v___x_1220_; 
lean_dec_ref(v_l_1217_);
lean_dec(v_00_u03c3_1216_);
v___x_1220_ = lean_array_to_list(v_a_1219_);
return v___x_1220_;
}
else
{
lean_object* v_head_1221_; lean_object* v_tail_1222_; lean_object* v___x_1223_; 
v_head_1221_ = lean_ctor_get(v_a_1218_, 0);
lean_inc(v_head_1221_);
v_tail_1222_ = lean_ctor_get(v_a_1218_, 1);
lean_inc(v_tail_1222_);
lean_dec_ref_known(v_a_1218_, 2);
lean_inc_ref(v_l_1217_);
lean_inc(v_00_u03c3_1216_);
v___x_1223_ = lp_algalVerification_Algal_Memory_matchLit(v_00_u03c3_1216_, v_l_1217_, v_head_1221_);
if (lean_obj_tag(v___x_1223_) == 0)
{
v_a_1218_ = v_tail_1222_;
goto _start;
}
else
{
lean_object* v_val_1225_; lean_object* v___x_1226_; 
v_val_1225_ = lean_ctor_get(v___x_1223_, 0);
lean_inc(v_val_1225_);
lean_dec_ref_known(v___x_1223_, 1);
v___x_1226_ = lean_array_push(v_a_1219_, v_val_1225_);
v_a_1218_ = v_tail_1222_;
v_a_1219_ = v___x_1226_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_joinLit(lean_object* v_00_u03c3_1230_, lean_object* v_l_1231_, lean_object* v_ts_1232_){
_start:
{
lean_object* v___x_1233_; lean_object* v___x_1234_; 
v___x_1233_ = ((lean_object*)(lp_algalVerification_Algal_Memory_joinLit___closed__0));
v___x_1234_ = lp_algalVerification_List_filterMapTR_go___at___00Algal_Memory_joinLit_spec__0(v_00_u03c3_1230_, v_l_1231_, v_ts_1232_, v___x_1233_);
return v___x_1234_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_joinBody(lean_object* v_00_u03c3_1235_, lean_object* v_ls_1236_, lean_object* v_ts_1237_){
_start:
{
if (lean_obj_tag(v_ls_1236_) == 0)
{
lean_object* v___x_1238_; lean_object* v___x_1239_; 
lean_dec(v_ts_1237_);
v___x_1238_ = lean_box(0);
v___x_1239_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1239_, 0, v_00_u03c3_1235_);
lean_ctor_set(v___x_1239_, 1, v___x_1238_);
return v___x_1239_;
}
else
{
lean_object* v_head_1240_; lean_object* v_tail_1241_; lean_object* v___x_1242_; lean_object* v___x_1243_; lean_object* v___x_1244_; 
v_head_1240_ = lean_ctor_get(v_ls_1236_, 0);
lean_inc(v_head_1240_);
v_tail_1241_ = lean_ctor_get(v_ls_1236_, 1);
lean_inc(v_tail_1241_);
lean_dec_ref_known(v_ls_1236_, 2);
lean_inc(v_ts_1237_);
v___x_1242_ = lp_algalVerification_Algal_Memory_joinLit(v_00_u03c3_1235_, v_head_1240_, v_ts_1237_);
v___x_1243_ = ((lean_object*)(lp_algalVerification_Algal_Memory_joinLit___closed__0));
v___x_1244_ = lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_joinBody_spec__0(v_tail_1241_, v_ts_1237_, v___x_1242_, v___x_1243_);
return v___x_1244_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_joinBody_spec__0(lean_object* v_tail_1245_, lean_object* v_ts_1246_, lean_object* v_a_1247_, lean_object* v_a_1248_){
_start:
{
if (lean_obj_tag(v_a_1247_) == 0)
{
lean_object* v___x_1249_; 
lean_dec(v_ts_1246_);
lean_dec(v_tail_1245_);
v___x_1249_ = lean_array_to_list(v_a_1248_);
return v___x_1249_;
}
else
{
lean_object* v_head_1250_; lean_object* v_tail_1251_; lean_object* v___x_1252_; lean_object* v___x_1253_; 
v_head_1250_ = lean_ctor_get(v_a_1247_, 0);
lean_inc(v_head_1250_);
v_tail_1251_ = lean_ctor_get(v_a_1247_, 1);
lean_inc(v_tail_1251_);
lean_dec_ref_known(v_a_1247_, 2);
lean_inc(v_ts_1246_);
lean_inc(v_tail_1245_);
v___x_1252_ = lp_algalVerification_Algal_Memory_joinBody(v_head_1250_, v_tail_1245_, v_ts_1246_);
v___x_1253_ = l_List_foldl___at___00Array_appendList_spec__0___redArg(v_a_1248_, v___x_1252_);
v_a_1247_ = v_tail_1251_;
v_a_1248_ = v___x_1253_;
goto _start;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_joinBody_match__1_splitter___redArg(lean_object* v_ls_1255_, lean_object* v_h__1_1256_, lean_object* v_h__2_1257_){
_start:
{
if (lean_obj_tag(v_ls_1255_) == 0)
{
lean_object* v___x_1258_; lean_object* v___x_1259_; 
lean_dec(v_h__2_1257_);
v___x_1258_ = lean_box(0);
v___x_1259_ = lean_apply_1(v_h__1_1256_, v___x_1258_);
return v___x_1259_;
}
else
{
lean_object* v_head_1260_; lean_object* v_tail_1261_; lean_object* v___x_1262_; 
lean_dec(v_h__1_1256_);
v_head_1260_ = lean_ctor_get(v_ls_1255_, 0);
lean_inc(v_head_1260_);
v_tail_1261_ = lean_ctor_get(v_ls_1255_, 1);
lean_inc(v_tail_1261_);
lean_dec_ref_known(v_ls_1255_, 2);
v___x_1262_ = lean_apply_2(v_h__2_1257_, v_head_1260_, v_tail_1261_);
return v___x_1262_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_joinBody_match__1_splitter(lean_object* v_motive_1263_, lean_object* v_ls_1264_, lean_object* v_h__1_1265_, lean_object* v_h__2_1266_){
_start:
{
if (lean_obj_tag(v_ls_1264_) == 0)
{
lean_object* v___x_1267_; lean_object* v___x_1268_; 
lean_dec(v_h__2_1266_);
v___x_1267_ = lean_box(0);
v___x_1268_ = lean_apply_1(v_h__1_1265_, v___x_1267_);
return v___x_1268_;
}
else
{
lean_object* v_head_1269_; lean_object* v_tail_1270_; lean_object* v___x_1271_; 
lean_dec(v_h__1_1265_);
v_head_1269_ = lean_ctor_get(v_ls_1264_, 0);
lean_inc(v_head_1269_);
v_tail_1270_ = lean_ctor_get(v_ls_1264_, 1);
lean_inc(v_tail_1270_);
lean_dec_ref_known(v_ls_1264_, 2);
v___x_1271_ = lean_apply_2(v_h__2_1266_, v_head_1269_, v_tail_1270_);
return v___x_1271_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_filterMapTR_go___at___00Algal_Memory_fire_spec__0(lean_object* v_r_1272_, lean_object* v_a_1273_, lean_object* v_a_1274_){
_start:
{
if (lean_obj_tag(v_a_1273_) == 0)
{
lean_object* v___x_1275_; 
lean_dec_ref(v_r_1272_);
v___x_1275_ = lean_array_to_list(v_a_1274_);
return v___x_1275_;
}
else
{
lean_object* v_head_1276_; lean_object* v_tail_1277_; lean_object* v_head_1278_; lean_object* v___x_1279_; 
v_head_1276_ = lean_ctor_get(v_a_1273_, 0);
lean_inc(v_head_1276_);
v_tail_1277_ = lean_ctor_get(v_a_1273_, 1);
lean_inc(v_tail_1277_);
lean_dec_ref_known(v_a_1273_, 2);
v_head_1278_ = lean_ctor_get(v_r_1272_, 1);
lean_inc_ref(v_head_1278_);
v___x_1279_ = lp_algalVerification_Algal_Memory_instLit(v_head_1276_, v_head_1278_);
if (lean_obj_tag(v___x_1279_) == 0)
{
v_a_1273_ = v_tail_1277_;
goto _start;
}
else
{
lean_object* v_val_1281_; lean_object* v___x_1282_; 
v_val_1281_ = lean_ctor_get(v___x_1279_, 0);
lean_inc(v_val_1281_);
lean_dec_ref_known(v___x_1279_, 1);
v___x_1282_ = lean_array_push(v_a_1274_, v_val_1281_);
v_a_1273_ = v_tail_1277_;
v_a_1274_ = v___x_1282_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_fire(lean_object* v_r_1286_, lean_object* v_ts_1287_){
_start:
{
lean_object* v_body_1288_; lean_object* v___x_1289_; lean_object* v___x_1290_; lean_object* v___x_1291_; lean_object* v___x_1292_; 
v_body_1288_ = lean_ctor_get(v_r_1286_, 2);
v___x_1289_ = lean_box(0);
lean_inc(v_body_1288_);
v___x_1290_ = lp_algalVerification_Algal_Memory_joinBody(v___x_1289_, v_body_1288_, v_ts_1287_);
v___x_1291_ = ((lean_object*)(lp_algalVerification_Algal_Memory_fire___closed__0));
v___x_1292_ = lp_algalVerification_List_filterMapTR_go___at___00Algal_Memory_fire_spec__0(v_r_1286_, v___x_1290_, v___x_1291_);
return v___x_1292_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_insertAll___redArg(lean_object* v_inst_1293_, lean_object* v_known_1294_, lean_object* v_x_1295_){
_start:
{
if (lean_obj_tag(v_x_1295_) == 0)
{
lean_dec_ref(v_inst_1293_);
return v_known_1294_;
}
else
{
lean_object* v_head_1296_; lean_object* v_tail_1297_; lean_object* v___x_1299_; uint8_t v_isShared_1300_; uint8_t v_isSharedCheck_1310_; 
v_head_1296_ = lean_ctor_get(v_x_1295_, 0);
v_tail_1297_ = lean_ctor_get(v_x_1295_, 1);
v_isSharedCheck_1310_ = !lean_is_exclusive(v_x_1295_);
if (v_isSharedCheck_1310_ == 0)
{
v___x_1299_ = v_x_1295_;
v_isShared_1300_ = v_isSharedCheck_1310_;
goto v_resetjp_1298_;
}
else
{
lean_inc(v_tail_1297_);
lean_inc(v_head_1296_);
lean_dec(v_x_1295_);
v___x_1299_ = lean_box(0);
v_isShared_1300_ = v_isSharedCheck_1310_;
goto v_resetjp_1298_;
}
v_resetjp_1298_:
{
lean_object* v___f_1301_; uint8_t v___x_1302_; 
lean_inc_ref(v_inst_1293_);
v___f_1301_ = lean_alloc_closure((void*)(l_instBEqOfDecidableEq___redArg___lam__0___boxed), 3, 1);
lean_closure_set(v___f_1301_, 0, v_inst_1293_);
lean_inc(v_known_1294_);
lean_inc(v_head_1296_);
v___x_1302_ = l_List_elem___redArg(v___f_1301_, v_head_1296_, v_known_1294_);
if (v___x_1302_ == 0)
{
lean_object* v___x_1303_; lean_object* v___x_1305_; 
v___x_1303_ = lean_box(0);
if (v_isShared_1300_ == 0)
{
lean_ctor_set(v___x_1299_, 1, v___x_1303_);
v___x_1305_ = v___x_1299_;
goto v_reusejp_1304_;
}
else
{
lean_object* v_reuseFailAlloc_1308_; 
v_reuseFailAlloc_1308_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1308_, 0, v_head_1296_);
lean_ctor_set(v_reuseFailAlloc_1308_, 1, v___x_1303_);
v___x_1305_ = v_reuseFailAlloc_1308_;
goto v_reusejp_1304_;
}
v_reusejp_1304_:
{
lean_object* v___x_1306_; 
v___x_1306_ = l_List_appendTR___redArg(v_known_1294_, v___x_1305_);
v_known_1294_ = v___x_1306_;
v_x_1295_ = v_tail_1297_;
goto _start;
}
}
else
{
lean_del_object(v___x_1299_);
lean_dec(v_head_1296_);
v_x_1295_ = v_tail_1297_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_insertAll(lean_object* v_00_u03b1_1311_, lean_object* v_inst_1312_, lean_object* v_known_1313_, lean_object* v_x_1314_){
_start:
{
lean_object* v___x_1315_; 
v___x_1315_ = lp_algalVerification_Algal_Memory_insertAll___redArg(v_inst_1312_, v_known_1313_, v_x_1314_);
return v___x_1315_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_eraseFirst___redArg(lean_object* v_inst_1316_, lean_object* v_a_1317_, lean_object* v_x_1318_){
_start:
{
if (lean_obj_tag(v_x_1318_) == 0)
{
lean_dec(v_a_1317_);
lean_dec_ref(v_inst_1316_);
return v_x_1318_;
}
else
{
lean_object* v_head_1319_; lean_object* v_tail_1320_; lean_object* v___x_1322_; uint8_t v_isShared_1323_; uint8_t v_isSharedCheck_1330_; 
v_head_1319_ = lean_ctor_get(v_x_1318_, 0);
v_tail_1320_ = lean_ctor_get(v_x_1318_, 1);
v_isSharedCheck_1330_ = !lean_is_exclusive(v_x_1318_);
if (v_isSharedCheck_1330_ == 0)
{
v___x_1322_ = v_x_1318_;
v_isShared_1323_ = v_isSharedCheck_1330_;
goto v_resetjp_1321_;
}
else
{
lean_inc(v_tail_1320_);
lean_inc(v_head_1319_);
lean_dec(v_x_1318_);
v___x_1322_ = lean_box(0);
v_isShared_1323_ = v_isSharedCheck_1330_;
goto v_resetjp_1321_;
}
v_resetjp_1321_:
{
lean_object* v___x_1324_; uint8_t v___x_1325_; 
lean_inc_ref(v_inst_1316_);
lean_inc(v_a_1317_);
lean_inc(v_head_1319_);
v___x_1324_ = lean_apply_2(v_inst_1316_, v_head_1319_, v_a_1317_);
v___x_1325_ = lean_unbox(v___x_1324_);
if (v___x_1325_ == 0)
{
lean_object* v___x_1326_; lean_object* v___x_1328_; 
v___x_1326_ = lp_algalVerification_Algal_Memory_eraseFirst___redArg(v_inst_1316_, v_a_1317_, v_tail_1320_);
if (v_isShared_1323_ == 0)
{
lean_ctor_set(v___x_1322_, 1, v___x_1326_);
v___x_1328_ = v___x_1322_;
goto v_reusejp_1327_;
}
else
{
lean_object* v_reuseFailAlloc_1329_; 
v_reuseFailAlloc_1329_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1329_, 0, v_head_1319_);
lean_ctor_set(v_reuseFailAlloc_1329_, 1, v___x_1326_);
v___x_1328_ = v_reuseFailAlloc_1329_;
goto v_reusejp_1327_;
}
v_reusejp_1327_:
{
return v___x_1328_;
}
}
else
{
lean_del_object(v___x_1322_);
lean_dec(v_head_1319_);
lean_dec(v_a_1317_);
lean_dec_ref(v_inst_1316_);
return v_tail_1320_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_eraseFirst(lean_object* v_00_u03b1_1331_, lean_object* v_inst_1332_, lean_object* v_a_1333_, lean_object* v_x_1334_){
_start:
{
lean_object* v___x_1335_; 
v___x_1335_ = lp_algalVerification_Algal_Memory_eraseFirst___redArg(v_inst_1332_, v_a_1333_, v_x_1334_);
return v___x_1335_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_seed_spec__0(lean_object* v_a_1336_, lean_object* v_a_1337_){
_start:
{
if (lean_obj_tag(v_a_1336_) == 0)
{
lean_object* v___x_1338_; 
v___x_1338_ = l_List_reverse___redArg(v_a_1337_);
return v___x_1338_;
}
else
{
lean_object* v_head_1339_; lean_object* v_tail_1340_; lean_object* v___x_1342_; uint8_t v_isShared_1343_; uint8_t v_isSharedCheck_1349_; 
v_head_1339_ = lean_ctor_get(v_a_1336_, 0);
v_tail_1340_ = lean_ctor_get(v_a_1336_, 1);
v_isSharedCheck_1349_ = !lean_is_exclusive(v_a_1336_);
if (v_isSharedCheck_1349_ == 0)
{
v___x_1342_ = v_a_1336_;
v_isShared_1343_ = v_isSharedCheck_1349_;
goto v_resetjp_1341_;
}
else
{
lean_inc(v_tail_1340_);
lean_inc(v_head_1339_);
lean_dec(v_a_1336_);
v___x_1342_ = lean_box(0);
v_isShared_1343_ = v_isSharedCheck_1349_;
goto v_resetjp_1341_;
}
v_resetjp_1341_:
{
lean_object* v_tuple_1344_; lean_object* v___x_1346_; 
v_tuple_1344_ = lean_ctor_get(v_head_1339_, 0);
lean_inc_ref(v_tuple_1344_);
lean_dec(v_head_1339_);
if (v_isShared_1343_ == 0)
{
lean_ctor_set(v___x_1342_, 1, v_a_1337_);
lean_ctor_set(v___x_1342_, 0, v_tuple_1344_);
v___x_1346_ = v___x_1342_;
goto v_reusejp_1345_;
}
else
{
lean_object* v_reuseFailAlloc_1348_; 
v_reuseFailAlloc_1348_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1348_, 0, v_tuple_1344_);
lean_ctor_set(v_reuseFailAlloc_1348_, 1, v_a_1337_);
v___x_1346_ = v_reuseFailAlloc_1348_;
goto v_reusejp_1345_;
}
v_reusejp_1345_:
{
v_a_1336_ = v_tail_1340_;
v_a_1337_ = v___x_1346_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_seed(lean_object* v_fs_1350_){
_start:
{
lean_object* v___x_1351_; lean_object* v___x_1352_; 
v___x_1351_ = lean_box(0);
v___x_1352_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_seed_spec__0(v_fs_1350_, v___x_1351_);
return v___x_1352_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_round_spec__0(lean_object* v_ts_1353_, lean_object* v_a_1354_, lean_object* v_a_1355_){
_start:
{
if (lean_obj_tag(v_a_1354_) == 0)
{
lean_object* v___x_1356_; 
lean_dec(v_ts_1353_);
v___x_1356_ = lean_array_to_list(v_a_1355_);
return v___x_1356_;
}
else
{
lean_object* v_head_1357_; lean_object* v_tail_1358_; lean_object* v___x_1359_; lean_object* v___x_1360_; 
v_head_1357_ = lean_ctor_get(v_a_1354_, 0);
lean_inc(v_head_1357_);
v_tail_1358_ = lean_ctor_get(v_a_1354_, 1);
lean_inc(v_tail_1358_);
lean_dec_ref_known(v_a_1354_, 2);
lean_inc(v_ts_1353_);
v___x_1359_ = lp_algalVerification_Algal_Memory_fire(v_head_1357_, v_ts_1353_);
v___x_1360_ = l_List_foldl___at___00Array_appendList_spec__0___redArg(v_a_1355_, v___x_1359_);
v_a_1354_ = v_tail_1358_;
v_a_1355_ = v___x_1360_;
goto _start;
}
}
}
static lean_object* _init_lp_algalVerification_Algal_Memory_insertAll___at___00Algal_Memory_round_spec__1___closed__0(void){
_start:
{
lean_object* v___x_1362_; lean_object* v___f_1363_; 
v___x_1362_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Memory_instDecidableEqTuple___boxed), 2, 0);
v___f_1363_ = lean_alloc_closure((void*)(l_instBEqOfDecidableEq___redArg___lam__0___boxed), 3, 1);
lean_closure_set(v___f_1363_, 0, v___x_1362_);
return v___f_1363_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_insertAll___at___00Algal_Memory_round_spec__1(lean_object* v_known_1364_, lean_object* v_x_1365_){
_start:
{
if (lean_obj_tag(v_x_1365_) == 0)
{
return v_known_1364_;
}
else
{
lean_object* v_head_1366_; lean_object* v_tail_1367_; lean_object* v___x_1369_; uint8_t v_isShared_1370_; uint8_t v_isSharedCheck_1380_; 
v_head_1366_ = lean_ctor_get(v_x_1365_, 0);
v_tail_1367_ = lean_ctor_get(v_x_1365_, 1);
v_isSharedCheck_1380_ = !lean_is_exclusive(v_x_1365_);
if (v_isSharedCheck_1380_ == 0)
{
v___x_1369_ = v_x_1365_;
v_isShared_1370_ = v_isSharedCheck_1380_;
goto v_resetjp_1368_;
}
else
{
lean_inc(v_tail_1367_);
lean_inc(v_head_1366_);
lean_dec(v_x_1365_);
v___x_1369_ = lean_box(0);
v_isShared_1370_ = v_isSharedCheck_1380_;
goto v_resetjp_1368_;
}
v_resetjp_1368_:
{
lean_object* v___f_1371_; uint8_t v___x_1372_; 
v___f_1371_ = lean_obj_once(&lp_algalVerification_Algal_Memory_insertAll___at___00Algal_Memory_round_spec__1___closed__0, &lp_algalVerification_Algal_Memory_insertAll___at___00Algal_Memory_round_spec__1___closed__0_once, _init_lp_algalVerification_Algal_Memory_insertAll___at___00Algal_Memory_round_spec__1___closed__0);
lean_inc(v_known_1364_);
lean_inc(v_head_1366_);
v___x_1372_ = l_List_elem___redArg(v___f_1371_, v_head_1366_, v_known_1364_);
if (v___x_1372_ == 0)
{
lean_object* v___x_1373_; lean_object* v___x_1375_; 
v___x_1373_ = lean_box(0);
if (v_isShared_1370_ == 0)
{
lean_ctor_set(v___x_1369_, 1, v___x_1373_);
v___x_1375_ = v___x_1369_;
goto v_reusejp_1374_;
}
else
{
lean_object* v_reuseFailAlloc_1378_; 
v_reuseFailAlloc_1378_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1378_, 0, v_head_1366_);
lean_ctor_set(v_reuseFailAlloc_1378_, 1, v___x_1373_);
v___x_1375_ = v_reuseFailAlloc_1378_;
goto v_reusejp_1374_;
}
v_reusejp_1374_:
{
lean_object* v___x_1376_; 
v___x_1376_ = l_List_appendTR___redArg(v_known_1364_, v___x_1375_);
v_known_1364_ = v___x_1376_;
v_x_1365_ = v_tail_1367_;
goto _start;
}
}
else
{
lean_del_object(v___x_1369_);
lean_dec(v_head_1366_);
v_x_1365_ = v_tail_1367_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_round(lean_object* v_rs_1381_, lean_object* v_ts_1382_){
_start:
{
lean_object* v___x_1383_; lean_object* v___x_1384_; lean_object* v___x_1385_; 
v___x_1383_ = ((lean_object*)(lp_algalVerification_Algal_Memory_fire___closed__0));
lean_inc(v_ts_1382_);
v___x_1384_ = lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_round_spec__0(v_ts_1382_, v_rs_1381_, v___x_1383_);
v___x_1385_ = lp_algalVerification_Algal_Memory_insertAll___at___00Algal_Memory_round_spec__1(v_ts_1382_, v___x_1384_);
return v___x_1385_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_iter(lean_object* v_rs_1386_, lean_object* v_fs_1387_, lean_object* v_x_1388_){
_start:
{
lean_object* v_zero_1389_; uint8_t v_isZero_1390_; 
v_zero_1389_ = lean_unsigned_to_nat(0u);
v_isZero_1390_ = lean_nat_dec_eq(v_x_1388_, v_zero_1389_);
if (v_isZero_1390_ == 1)
{
lean_object* v___x_1391_; 
lean_dec(v_rs_1386_);
v___x_1391_ = lp_algalVerification_Algal_Memory_seed(v_fs_1387_);
return v___x_1391_;
}
else
{
lean_object* v_one_1392_; lean_object* v_n_1393_; lean_object* v___x_1394_; lean_object* v___x_1395_; 
v_one_1392_ = lean_unsigned_to_nat(1u);
v_n_1393_ = lean_nat_sub(v_x_1388_, v_one_1392_);
lean_inc(v_rs_1386_);
v___x_1394_ = lp_algalVerification_Algal_Memory_iter(v_rs_1386_, v_fs_1387_, v_n_1393_);
lean_dec(v_n_1393_);
v___x_1395_ = lp_algalVerification_Algal_Memory_round(v_rs_1386_, v___x_1394_);
return v___x_1395_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_iter___boxed(lean_object* v_rs_1396_, lean_object* v_fs_1397_, lean_object* v_x_1398_){
_start:
{
lean_object* v_res_1399_; 
v_res_1399_ = lp_algalVerification_Algal_Memory_iter(v_rs_1396_, v_fs_1397_, v_x_1398_);
lean_dec(v_x_1398_);
return v_res_1399_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_iter_match__1_splitter___redArg(lean_object* v_x_1400_, lean_object* v_h__1_1401_, lean_object* v_h__2_1402_){
_start:
{
lean_object* v_zero_1403_; uint8_t v_isZero_1404_; 
v_zero_1403_ = lean_unsigned_to_nat(0u);
v_isZero_1404_ = lean_nat_dec_eq(v_x_1400_, v_zero_1403_);
if (v_isZero_1404_ == 1)
{
lean_object* v___x_1405_; lean_object* v___x_1406_; 
lean_dec(v_h__2_1402_);
v___x_1405_ = lean_box(0);
v___x_1406_ = lean_apply_1(v_h__1_1401_, v___x_1405_);
return v___x_1406_;
}
else
{
lean_object* v_one_1407_; lean_object* v_n_1408_; lean_object* v___x_1409_; 
lean_dec(v_h__1_1401_);
v_one_1407_ = lean_unsigned_to_nat(1u);
v_n_1408_ = lean_nat_sub(v_x_1400_, v_one_1407_);
v___x_1409_ = lean_apply_1(v_h__2_1402_, v_n_1408_);
return v___x_1409_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_iter_match__1_splitter___redArg___boxed(lean_object* v_x_1410_, lean_object* v_h__1_1411_, lean_object* v_h__2_1412_){
_start:
{
lean_object* v_res_1413_; 
v_res_1413_ = lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_iter_match__1_splitter___redArg(v_x_1410_, v_h__1_1411_, v_h__2_1412_);
lean_dec(v_x_1410_);
return v_res_1413_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_iter_match__1_splitter(lean_object* v_motive_1414_, lean_object* v_x_1415_, lean_object* v_h__1_1416_, lean_object* v_h__2_1417_){
_start:
{
lean_object* v_zero_1418_; uint8_t v_isZero_1419_; 
v_zero_1418_ = lean_unsigned_to_nat(0u);
v_isZero_1419_ = lean_nat_dec_eq(v_x_1415_, v_zero_1418_);
if (v_isZero_1419_ == 1)
{
lean_object* v___x_1420_; lean_object* v___x_1421_; 
lean_dec(v_h__2_1417_);
v___x_1420_ = lean_box(0);
v___x_1421_ = lean_apply_1(v_h__1_1416_, v___x_1420_);
return v___x_1421_;
}
else
{
lean_object* v_one_1422_; lean_object* v_n_1423_; lean_object* v___x_1424_; 
lean_dec(v_h__1_1416_);
v_one_1422_ = lean_unsigned_to_nat(1u);
v_n_1423_ = lean_nat_sub(v_x_1415_, v_one_1422_);
v___x_1424_ = lean_apply_1(v_h__2_1417_, v_n_1423_);
return v___x_1424_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_iter_match__1_splitter___boxed(lean_object* v_motive_1425_, lean_object* v_x_1426_, lean_object* v_h__1_1427_, lean_object* v_h__2_1428_){
_start:
{
lean_object* v_res_1429_; 
v_res_1429_ = lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_iter_match__1_splitter(v_motive_1425_, v_x_1426_, v_h__1_1427_, v_h__2_1428_);
lean_dec(v_x_1426_);
return v_res_1429_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_literals_spec__1(lean_object* v_a_1430_, lean_object* v_a_1431_){
_start:
{
if (lean_obj_tag(v_a_1430_) == 0)
{
lean_object* v___x_1432_; 
v___x_1432_ = lean_array_to_list(v_a_1431_);
return v___x_1432_;
}
else
{
lean_object* v_head_1433_; lean_object* v_tail_1434_; lean_object* v___x_1436_; uint8_t v_isShared_1437_; uint8_t v_isSharedCheck_1445_; 
v_head_1433_ = lean_ctor_get(v_a_1430_, 0);
v_tail_1434_ = lean_ctor_get(v_a_1430_, 1);
v_isSharedCheck_1445_ = !lean_is_exclusive(v_a_1430_);
if (v_isSharedCheck_1445_ == 0)
{
v___x_1436_ = v_a_1430_;
v_isShared_1437_ = v_isSharedCheck_1445_;
goto v_resetjp_1435_;
}
else
{
lean_inc(v_tail_1434_);
lean_inc(v_head_1433_);
lean_dec(v_a_1430_);
v___x_1436_ = lean_box(0);
v_isShared_1437_ = v_isSharedCheck_1445_;
goto v_resetjp_1435_;
}
v_resetjp_1435_:
{
lean_object* v_head_1438_; lean_object* v_body_1439_; lean_object* v___x_1441_; 
v_head_1438_ = lean_ctor_get(v_head_1433_, 1);
lean_inc_ref(v_head_1438_);
v_body_1439_ = lean_ctor_get(v_head_1433_, 2);
lean_inc(v_body_1439_);
lean_dec(v_head_1433_);
if (v_isShared_1437_ == 0)
{
lean_ctor_set(v___x_1436_, 1, v_body_1439_);
lean_ctor_set(v___x_1436_, 0, v_head_1438_);
v___x_1441_ = v___x_1436_;
goto v_reusejp_1440_;
}
else
{
lean_object* v_reuseFailAlloc_1444_; 
v_reuseFailAlloc_1444_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1444_, 0, v_head_1438_);
lean_ctor_set(v_reuseFailAlloc_1444_, 1, v_body_1439_);
v___x_1441_ = v_reuseFailAlloc_1444_;
goto v_reusejp_1440_;
}
v_reusejp_1440_:
{
lean_object* v___x_1442_; 
v___x_1442_ = l_List_foldl___at___00Array_appendList_spec__0___redArg(v_a_1431_, v___x_1441_);
v_a_1430_ = v_tail_1434_;
v_a_1431_ = v___x_1442_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_literals_spec__0(lean_object* v_a_1446_, lean_object* v_a_1447_){
_start:
{
if (lean_obj_tag(v_a_1446_) == 0)
{
lean_object* v___x_1448_; 
v___x_1448_ = l_List_reverse___redArg(v_a_1447_);
return v___x_1448_;
}
else
{
lean_object* v_head_1449_; lean_object* v_tail_1450_; lean_object* v___x_1452_; uint8_t v_isShared_1453_; uint8_t v_isSharedCheck_1459_; 
v_head_1449_ = lean_ctor_get(v_a_1446_, 0);
v_tail_1450_ = lean_ctor_get(v_a_1446_, 1);
v_isSharedCheck_1459_ = !lean_is_exclusive(v_a_1446_);
if (v_isSharedCheck_1459_ == 0)
{
v___x_1452_ = v_a_1446_;
v_isShared_1453_ = v_isSharedCheck_1459_;
goto v_resetjp_1451_;
}
else
{
lean_inc(v_tail_1450_);
lean_inc(v_head_1449_);
lean_dec(v_a_1446_);
v___x_1452_ = lean_box(0);
v_isShared_1453_ = v_isSharedCheck_1459_;
goto v_resetjp_1451_;
}
v_resetjp_1451_:
{
lean_object* v___x_1454_; lean_object* v___x_1456_; 
v___x_1454_ = lp_algalVerification_Algal_Memory_Fact_lit(v_head_1449_);
if (v_isShared_1453_ == 0)
{
lean_ctor_set(v___x_1452_, 1, v_a_1447_);
lean_ctor_set(v___x_1452_, 0, v___x_1454_);
v___x_1456_ = v___x_1452_;
goto v_reusejp_1455_;
}
else
{
lean_object* v_reuseFailAlloc_1458_; 
v_reuseFailAlloc_1458_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1458_, 0, v___x_1454_);
lean_ctor_set(v_reuseFailAlloc_1458_, 1, v_a_1447_);
v___x_1456_ = v_reuseFailAlloc_1458_;
goto v_reusejp_1455_;
}
v_reusejp_1455_:
{
v_a_1446_ = v_tail_1450_;
v_a_1447_ = v___x_1456_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_literals(lean_object* v_rs_1462_, lean_object* v_fs_1463_){
_start:
{
lean_object* v___x_1464_; lean_object* v___x_1465_; lean_object* v___x_1466_; lean_object* v___x_1467_; lean_object* v___x_1468_; 
v___x_1464_ = lean_box(0);
v___x_1465_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_literals_spec__0(v_fs_1463_, v___x_1464_);
v___x_1466_ = ((lean_object*)(lp_algalVerification_Algal_Memory_literals___closed__0));
v___x_1467_ = lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_literals_spec__1(v_rs_1462_, v___x_1466_);
v___x_1468_ = l_List_appendTR___redArg(v___x_1465_, v___x_1467_);
return v___x_1468_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_filterMapTR_go___at___00Algal_Memory_litAtoms_spec__0(lean_object* v_a_1469_, lean_object* v_a_1470_){
_start:
{
if (lean_obj_tag(v_a_1469_) == 0)
{
lean_object* v___x_1471_; 
v___x_1471_ = lean_array_to_list(v_a_1470_);
return v___x_1471_;
}
else
{
lean_object* v_head_1472_; lean_object* v_tail_1473_; lean_object* v___x_1474_; 
v_head_1472_ = lean_ctor_get(v_a_1469_, 0);
lean_inc(v_head_1472_);
v_tail_1473_ = lean_ctor_get(v_a_1469_, 1);
lean_inc(v_tail_1473_);
lean_dec_ref_known(v_a_1469_, 2);
v___x_1474_ = lp_algalVerification_Algal_Memory_Term_atomOf(v_head_1472_);
if (lean_obj_tag(v___x_1474_) == 0)
{
v_a_1469_ = v_tail_1473_;
goto _start;
}
else
{
lean_object* v_val_1476_; lean_object* v___x_1477_; 
v_val_1476_ = lean_ctor_get(v___x_1474_, 0);
lean_inc(v_val_1476_);
lean_dec_ref_known(v___x_1474_, 1);
v___x_1477_ = lean_array_push(v_a_1470_, v_val_1476_);
v_a_1469_ = v_tail_1473_;
v_a_1470_ = v___x_1477_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_litAtoms(lean_object* v_l_1481_){
_start:
{
lean_object* v_terms_1482_; lean_object* v___x_1483_; lean_object* v___x_1484_; 
v_terms_1482_ = lean_ctor_get(v_l_1481_, 1);
lean_inc(v_terms_1482_);
lean_dec_ref(v_l_1481_);
v___x_1483_ = ((lean_object*)(lp_algalVerification_Algal_Memory_litAtoms___closed__0));
v___x_1484_ = lp_algalVerification_List_filterMapTR_go___at___00Algal_Memory_litAtoms_spec__0(v_terms_1482_, v___x_1483_);
return v___x_1484_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_domain_spec__0(lean_object* v_a_1485_, lean_object* v_a_1486_){
_start:
{
if (lean_obj_tag(v_a_1485_) == 0)
{
lean_object* v___x_1487_; 
v___x_1487_ = lean_array_to_list(v_a_1486_);
return v___x_1487_;
}
else
{
lean_object* v_head_1488_; lean_object* v_tail_1489_; lean_object* v___x_1490_; lean_object* v___x_1491_; 
v_head_1488_ = lean_ctor_get(v_a_1485_, 0);
lean_inc(v_head_1488_);
v_tail_1489_ = lean_ctor_get(v_a_1485_, 1);
lean_inc(v_tail_1489_);
lean_dec_ref_known(v_a_1485_, 2);
v___x_1490_ = lp_algalVerification_Algal_Memory_litAtoms(v_head_1488_);
v___x_1491_ = l_List_foldl___at___00Array_appendList_spec__0___redArg(v_a_1486_, v___x_1490_);
v_a_1485_ = v_tail_1489_;
v_a_1486_ = v___x_1491_;
goto _start;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_domain(lean_object* v_rs_1493_, lean_object* v_fs_1494_){
_start:
{
lean_object* v___x_1495_; lean_object* v___x_1496_; lean_object* v___x_1497_; 
v___x_1495_ = lp_algalVerification_Algal_Memory_literals(v_rs_1493_, v_fs_1494_);
v___x_1496_ = ((lean_object*)(lp_algalVerification_Algal_Memory_litAtoms___closed__0));
v___x_1497_ = lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_domain_spec__0(v___x_1495_, v___x_1496_);
return v___x_1497_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList___redArg___lam__0(lean_object* v_a_1498_, lean_object* v_x_1499_){
_start:
{
lean_object* v___x_1500_; 
v___x_1500_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1500_, 0, v_a_1498_);
lean_ctor_set(v___x_1500_, 1, v_x_1499_);
return v___x_1500_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList___redArg___lam__1___boxed(lean_object* v_xs_1503_, lean_object* v_n_1504_, lean_object* v_a_1505_){
_start:
{
lean_object* v_res_1506_; 
v_res_1506_ = lp_algalVerification_Algal_Memory_powList___redArg___lam__1(v_xs_1503_, v_n_1504_, v_a_1505_);
lean_dec(v_n_1504_);
return v_res_1506_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList___redArg(lean_object* v_xs_1509_, lean_object* v_x_1510_){
_start:
{
lean_object* v_zero_1511_; uint8_t v_isZero_1512_; 
v_zero_1511_ = lean_unsigned_to_nat(0u);
v_isZero_1512_ = lean_nat_dec_eq(v_x_1510_, v_zero_1511_);
if (v_isZero_1512_ == 1)
{
lean_object* v___x_1513_; 
lean_dec(v_xs_1509_);
v___x_1513_ = ((lean_object*)(lp_algalVerification_Algal_Memory_powList___redArg___closed__0));
return v___x_1513_;
}
else
{
lean_object* v_one_1514_; lean_object* v_n_1515_; lean_object* v___f_1516_; lean_object* v___x_1517_; lean_object* v___x_1518_; 
v_one_1514_ = lean_unsigned_to_nat(1u);
v_n_1515_ = lean_nat_sub(v_x_1510_, v_one_1514_);
lean_inc(v_xs_1509_);
v___f_1516_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Memory_powList___redArg___lam__1___boxed), 3, 2);
lean_closure_set(v___f_1516_, 0, v_xs_1509_);
lean_closure_set(v___f_1516_, 1, v_n_1515_);
v___x_1517_ = ((lean_object*)(lp_algalVerification_Algal_Memory_powList___redArg___closed__1));
v___x_1518_ = l___private_Init_Data_List_Impl_0__List_flatMapTR_go___redArg(v___f_1516_, v_xs_1509_, v___x_1517_);
return v___x_1518_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList___redArg___lam__1(lean_object* v_xs_1519_, lean_object* v_n_1520_, lean_object* v_a_1521_){
_start:
{
lean_object* v___f_1522_; lean_object* v___x_1523_; lean_object* v___x_1524_; lean_object* v___x_1525_; 
v___f_1522_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Memory_powList___redArg___lam__0), 2, 1);
lean_closure_set(v___f_1522_, 0, v_a_1521_);
v___x_1523_ = lp_algalVerification_Algal_Memory_powList___redArg(v_xs_1519_, v_n_1520_);
v___x_1524_ = lean_box(0);
v___x_1525_ = l_List_mapTR_loop___redArg(v___f_1522_, v___x_1523_, v___x_1524_);
return v___x_1525_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList___redArg___boxed(lean_object* v_xs_1526_, lean_object* v_x_1527_){
_start:
{
lean_object* v_res_1528_; 
v_res_1528_ = lp_algalVerification_Algal_Memory_powList___redArg(v_xs_1526_, v_x_1527_);
lean_dec(v_x_1527_);
return v_res_1528_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList(lean_object* v_00_u03b1_1529_, lean_object* v_inst_1530_, lean_object* v_xs_1531_, lean_object* v_x_1532_){
_start:
{
lean_object* v___x_1533_; 
v___x_1533_ = lp_algalVerification_Algal_Memory_powList___redArg(v_xs_1531_, v_x_1532_);
return v___x_1533_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList___boxed(lean_object* v_00_u03b1_1534_, lean_object* v_inst_1535_, lean_object* v_xs_1536_, lean_object* v_x_1537_){
_start:
{
lean_object* v_res_1538_; 
v_res_1538_ = lp_algalVerification_Algal_Memory_powList(v_00_u03b1_1534_, v_inst_1535_, v_xs_1536_, v_x_1537_);
lean_dec(v_x_1537_);
lean_dec_ref(v_inst_1535_);
return v_res_1538_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_univ_spec__1(lean_object* v_l_1539_, lean_object* v_a_1540_, lean_object* v_a_1541_){
_start:
{
if (lean_obj_tag(v_a_1540_) == 0)
{
lean_object* v___x_1542_; 
v___x_1542_ = l_List_reverse___redArg(v_a_1541_);
return v___x_1542_;
}
else
{
lean_object* v_head_1543_; lean_object* v_tail_1544_; lean_object* v___x_1546_; uint8_t v_isShared_1547_; uint8_t v_isSharedCheck_1554_; 
v_head_1543_ = lean_ctor_get(v_a_1540_, 0);
v_tail_1544_ = lean_ctor_get(v_a_1540_, 1);
v_isSharedCheck_1554_ = !lean_is_exclusive(v_a_1540_);
if (v_isSharedCheck_1554_ == 0)
{
v___x_1546_ = v_a_1540_;
v_isShared_1547_ = v_isSharedCheck_1554_;
goto v_resetjp_1545_;
}
else
{
lean_inc(v_tail_1544_);
lean_inc(v_head_1543_);
lean_dec(v_a_1540_);
v___x_1546_ = lean_box(0);
v_isShared_1547_ = v_isSharedCheck_1554_;
goto v_resetjp_1545_;
}
v_resetjp_1545_:
{
lean_object* v_relation_1548_; lean_object* v___x_1549_; lean_object* v___x_1551_; 
v_relation_1548_ = lean_ctor_get(v_l_1539_, 0);
lean_inc_ref(v_relation_1548_);
v___x_1549_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1549_, 0, v_relation_1548_);
lean_ctor_set(v___x_1549_, 1, v_head_1543_);
if (v_isShared_1547_ == 0)
{
lean_ctor_set(v___x_1546_, 1, v_a_1541_);
lean_ctor_set(v___x_1546_, 0, v___x_1549_);
v___x_1551_ = v___x_1546_;
goto v_reusejp_1550_;
}
else
{
lean_object* v_reuseFailAlloc_1553_; 
v_reuseFailAlloc_1553_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1553_, 0, v___x_1549_);
lean_ctor_set(v_reuseFailAlloc_1553_, 1, v_a_1541_);
v___x_1551_ = v_reuseFailAlloc_1553_;
goto v_reusejp_1550_;
}
v_reusejp_1550_:
{
v_a_1540_ = v_tail_1544_;
v_a_1541_ = v___x_1551_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_univ_spec__1___boxed(lean_object* v_l_1555_, lean_object* v_a_1556_, lean_object* v_a_1557_){
_start:
{
lean_object* v_res_1558_; 
v_res_1558_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_univ_spec__1(v_l_1555_, v_a_1556_, v_a_1557_);
lean_dec_ref(v_l_1555_);
return v_res_1558_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_powList___at___00Algal_Memory_univ_spec__0_spec__0(lean_object* v_a_1559_, lean_object* v_a_1560_, lean_object* v_a_1561_){
_start:
{
if (lean_obj_tag(v_a_1560_) == 0)
{
lean_object* v___x_1562_; 
lean_dec(v_a_1559_);
v___x_1562_ = l_List_reverse___redArg(v_a_1561_);
return v___x_1562_;
}
else
{
lean_object* v_head_1563_; lean_object* v_tail_1564_; lean_object* v___x_1566_; uint8_t v_isShared_1567_; uint8_t v_isSharedCheck_1573_; 
v_head_1563_ = lean_ctor_get(v_a_1560_, 0);
v_tail_1564_ = lean_ctor_get(v_a_1560_, 1);
v_isSharedCheck_1573_ = !lean_is_exclusive(v_a_1560_);
if (v_isSharedCheck_1573_ == 0)
{
v___x_1566_ = v_a_1560_;
v_isShared_1567_ = v_isSharedCheck_1573_;
goto v_resetjp_1565_;
}
else
{
lean_inc(v_tail_1564_);
lean_inc(v_head_1563_);
lean_dec(v_a_1560_);
v___x_1566_ = lean_box(0);
v_isShared_1567_ = v_isSharedCheck_1573_;
goto v_resetjp_1565_;
}
v_resetjp_1565_:
{
lean_object* v___x_1569_; 
lean_inc(v_a_1559_);
if (v_isShared_1567_ == 0)
{
lean_ctor_set(v___x_1566_, 1, v_head_1563_);
lean_ctor_set(v___x_1566_, 0, v_a_1559_);
v___x_1569_ = v___x_1566_;
goto v_reusejp_1568_;
}
else
{
lean_object* v_reuseFailAlloc_1572_; 
v_reuseFailAlloc_1572_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1572_, 0, v_a_1559_);
lean_ctor_set(v_reuseFailAlloc_1572_, 1, v_head_1563_);
v___x_1569_ = v_reuseFailAlloc_1572_;
goto v_reusejp_1568_;
}
v_reusejp_1568_:
{
lean_object* v___x_1570_; 
v___x_1570_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1570_, 0, v___x_1569_);
lean_ctor_set(v___x_1570_, 1, v_a_1561_);
v_a_1560_ = v_tail_1564_;
v_a_1561_ = v___x_1570_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList___at___00Algal_Memory_univ_spec__0(lean_object* v_xs_1578_, lean_object* v_x_1579_){
_start:
{
lean_object* v_zero_1580_; uint8_t v_isZero_1581_; 
v_zero_1580_ = lean_unsigned_to_nat(0u);
v_isZero_1581_ = lean_nat_dec_eq(v_x_1579_, v_zero_1580_);
if (v_isZero_1581_ == 1)
{
lean_object* v___x_1582_; 
lean_dec(v_xs_1578_);
v___x_1582_ = ((lean_object*)(lp_algalVerification_Algal_Memory_powList___at___00Algal_Memory_univ_spec__0___closed__0));
return v___x_1582_;
}
else
{
lean_object* v_one_1583_; lean_object* v_n_1584_; lean_object* v___x_1585_; lean_object* v___x_1586_; 
v_one_1583_ = lean_unsigned_to_nat(1u);
v_n_1584_ = lean_nat_sub(v_x_1579_, v_one_1583_);
v___x_1585_ = ((lean_object*)(lp_algalVerification_Algal_Memory_powList___at___00Algal_Memory_univ_spec__0___closed__1));
lean_inc(v_xs_1578_);
v___x_1586_ = lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_powList___at___00Algal_Memory_univ_spec__0_spec__1(v_xs_1578_, v_n_1584_, v_xs_1578_, v___x_1585_);
lean_dec(v_n_1584_);
return v___x_1586_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_powList___at___00Algal_Memory_univ_spec__0_spec__1(lean_object* v_xs_1587_, lean_object* v_n_1588_, lean_object* v_a_1589_, lean_object* v_a_1590_){
_start:
{
if (lean_obj_tag(v_a_1589_) == 0)
{
lean_object* v___x_1591_; 
lean_dec(v_xs_1587_);
v___x_1591_ = lean_array_to_list(v_a_1590_);
return v___x_1591_;
}
else
{
lean_object* v_head_1592_; lean_object* v_tail_1593_; lean_object* v___x_1594_; lean_object* v___x_1595_; lean_object* v___x_1596_; lean_object* v___x_1597_; 
v_head_1592_ = lean_ctor_get(v_a_1589_, 0);
lean_inc(v_head_1592_);
v_tail_1593_ = lean_ctor_get(v_a_1589_, 1);
lean_inc(v_tail_1593_);
lean_dec_ref_known(v_a_1589_, 2);
lean_inc(v_xs_1587_);
v___x_1594_ = lp_algalVerification_Algal_Memory_powList___at___00Algal_Memory_univ_spec__0(v_xs_1587_, v_n_1588_);
v___x_1595_ = lean_box(0);
v___x_1596_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_powList___at___00Algal_Memory_univ_spec__0_spec__0(v_head_1592_, v___x_1594_, v___x_1595_);
v___x_1597_ = l_List_foldl___at___00Array_appendList_spec__0___redArg(v_a_1590_, v___x_1596_);
v_a_1589_ = v_tail_1593_;
v_a_1590_ = v___x_1597_;
goto _start;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_powList___at___00Algal_Memory_univ_spec__0_spec__1___boxed(lean_object* v_xs_1599_, lean_object* v_n_1600_, lean_object* v_a_1601_, lean_object* v_a_1602_){
_start:
{
lean_object* v_res_1603_; 
v_res_1603_ = lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_powList___at___00Algal_Memory_univ_spec__0_spec__1(v_xs_1599_, v_n_1600_, v_a_1601_, v_a_1602_);
lean_dec(v_n_1600_);
return v_res_1603_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_powList___at___00Algal_Memory_univ_spec__0___boxed(lean_object* v_xs_1604_, lean_object* v_x_1605_){
_start:
{
lean_object* v_res_1606_; 
v_res_1606_ = lp_algalVerification_Algal_Memory_powList___at___00Algal_Memory_univ_spec__0(v_xs_1604_, v_x_1605_);
lean_dec(v_x_1605_);
return v_res_1606_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_univ_spec__2(lean_object* v_rs_1607_, lean_object* v_fs_1608_, lean_object* v_a_1609_, lean_object* v_a_1610_){
_start:
{
if (lean_obj_tag(v_a_1609_) == 0)
{
lean_object* v___x_1611_; 
lean_dec(v_fs_1608_);
lean_dec(v_rs_1607_);
v___x_1611_ = lean_array_to_list(v_a_1610_);
return v___x_1611_;
}
else
{
lean_object* v_head_1612_; lean_object* v_tail_1613_; lean_object* v_terms_1614_; lean_object* v___x_1615_; lean_object* v___x_1616_; lean_object* v___x_1617_; lean_object* v___x_1618_; lean_object* v___x_1619_; lean_object* v___x_1620_; 
v_head_1612_ = lean_ctor_get(v_a_1609_, 0);
v_tail_1613_ = lean_ctor_get(v_a_1609_, 1);
v_terms_1614_ = lean_ctor_get(v_head_1612_, 1);
lean_inc(v_fs_1608_);
lean_inc(v_rs_1607_);
v___x_1615_ = lp_algalVerification_Algal_Memory_domain(v_rs_1607_, v_fs_1608_);
v___x_1616_ = l_List_lengthTR___redArg(v_terms_1614_);
v___x_1617_ = lp_algalVerification_Algal_Memory_powList___at___00Algal_Memory_univ_spec__0(v___x_1615_, v___x_1616_);
lean_dec(v___x_1616_);
v___x_1618_ = lean_box(0);
v___x_1619_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Memory_univ_spec__1(v_head_1612_, v___x_1617_, v___x_1618_);
v___x_1620_ = l_List_foldl___at___00Array_appendList_spec__0___redArg(v_a_1610_, v___x_1619_);
v_a_1609_ = v_tail_1613_;
v_a_1610_ = v___x_1620_;
goto _start;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_univ_spec__2___boxed(lean_object* v_rs_1622_, lean_object* v_fs_1623_, lean_object* v_a_1624_, lean_object* v_a_1625_){
_start:
{
lean_object* v_res_1626_; 
v_res_1626_ = lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_univ_spec__2(v_rs_1622_, v_fs_1623_, v_a_1624_, v_a_1625_);
lean_dec(v_a_1624_);
return v_res_1626_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_univ(lean_object* v_rs_1627_, lean_object* v_fs_1628_){
_start:
{
lean_object* v___x_1629_; lean_object* v___x_1630_; lean_object* v___x_1631_; 
lean_inc(v_fs_1628_);
lean_inc(v_rs_1627_);
v___x_1629_ = lp_algalVerification_Algal_Memory_literals(v_rs_1627_, v_fs_1628_);
v___x_1630_ = ((lean_object*)(lp_algalVerification_Algal_Memory_fire___closed__0));
v___x_1631_ = lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Memory_univ_spec__2(v_rs_1627_, v_fs_1628_, v___x_1629_, v___x_1630_);
lean_dec(v___x_1629_);
return v___x_1631_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_reach(lean_object* v_rs_1632_, lean_object* v_fs_1633_){
_start:
{
lean_object* v___x_1634_; lean_object* v___x_1635_; lean_object* v___x_1636_; 
lean_inc(v_fs_1633_);
lean_inc(v_rs_1632_);
v___x_1634_ = lp_algalVerification_Algal_Memory_univ(v_rs_1632_, v_fs_1633_);
v___x_1635_ = l_List_lengthTR___redArg(v___x_1634_);
lean_dec(v___x_1634_);
v___x_1636_ = lp_algalVerification_Algal_Memory_iter(v_rs_1632_, v_fs_1633_, v___x_1635_);
lean_dec(v___x_1635_);
return v___x_1636_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_derivable__decidable___redArg(lean_object* v_rs_1637_, lean_object* v_fs_1638_, lean_object* v_t_1639_){
_start:
{
lean_object* v___f_1640_; lean_object* v___x_1641_; uint8_t v___x_1642_; 
v___f_1640_ = lean_obj_once(&lp_algalVerification_Algal_Memory_insertAll___at___00Algal_Memory_round_spec__1___closed__0, &lp_algalVerification_Algal_Memory_insertAll___at___00Algal_Memory_round_spec__1___closed__0_once, _init_lp_algalVerification_Algal_Memory_insertAll___at___00Algal_Memory_round_spec__1___closed__0);
v___x_1641_ = lp_algalVerification_Algal_Memory_reach(v_rs_1637_, v_fs_1638_);
v___x_1642_ = l_List_elem___redArg(v___f_1640_, v_t_1639_, v___x_1641_);
return v___x_1642_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_derivable__decidable___redArg___boxed(lean_object* v_rs_1643_, lean_object* v_fs_1644_, lean_object* v_t_1645_){
_start:
{
uint8_t v_res_1646_; lean_object* v_r_1647_; 
v_res_1646_ = lp_algalVerification_Algal_Memory_derivable__decidable___redArg(v_rs_1643_, v_fs_1644_, v_t_1645_);
v_r_1647_ = lean_box(v_res_1646_);
return v_r_1647_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_derivable__decidable(lean_object* v_rs_1648_, lean_object* v_fs_1649_, lean_object* v_hn_1650_, lean_object* v_t_1651_){
_start:
{
uint8_t v___x_1652_; 
v___x_1652_ = lp_algalVerification_Algal_Memory_derivable__decidable___redArg(v_rs_1648_, v_fs_1649_, v_t_1651_);
return v___x_1652_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_derivable__decidable___boxed(lean_object* v_rs_1653_, lean_object* v_fs_1654_, lean_object* v_hn_1655_, lean_object* v_t_1656_){
_start:
{
uint8_t v_res_1657_; lean_object* v_r_1658_; 
v_res_1657_ = lp_algalVerification_Algal_Memory_derivable__decidable(v_rs_1653_, v_fs_1654_, v_hn_1655_, v_t_1656_);
v_r_1658_ = lean_box(v_res_1657_);
return v_r_1658_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__0(lean_object* v_a_1659_, lean_object* v_b_1660_){
_start:
{
lean_object* v___x_1661_; lean_object* v___x_1662_; uint8_t v___x_1663_; 
v___x_1661_ = lean_alloc_closure((void*)(l_instDecidableEqString___boxed), 2, 0);
v___x_1662_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Memory_instDecidableEqAtom___boxed), 2, 0);
v___x_1663_ = l_instDecidableEqProd___redArg(v___x_1661_, v___x_1662_, v_a_1659_, v_b_1660_);
return v___x_1663_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__0___boxed(lean_object* v_a_1664_, lean_object* v_b_1665_){
_start:
{
uint8_t v_res_1666_; lean_object* v_r_1667_; 
v_res_1666_ = lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__0(v_a_1664_, v_b_1665_);
v_r_1667_ = lean_box(v_res_1666_);
return v_r_1667_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__1(lean_object* v___f_1668_, lean_object* v_a_1669_, lean_object* v_b_1670_){
_start:
{
uint8_t v___x_1671_; 
v___x_1671_ = l_instDecidableEqList___redArg(v___f_1668_, v_a_1669_, v_b_1670_);
return v___x_1671_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__1___boxed(lean_object* v___f_1672_, lean_object* v_a_1673_, lean_object* v_b_1674_){
_start:
{
uint8_t v_res_1675_; lean_object* v_r_1676_; 
v_res_1675_ = lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__1(v___f_1672_, v_a_1673_, v_b_1674_);
v_r_1676_ = lean_box(v_res_1675_);
return v_r_1676_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__2(lean_object* v___f_1677_, lean_object* v_a_1678_, lean_object* v_b_1679_){
_start:
{
lean_object* v___x_1680_; uint8_t v___x_1681_; 
v___x_1680_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Memory_instDecidableEqRule___boxed), 2, 0);
v___x_1681_ = l_instDecidableEqProd___redArg(v___x_1680_, v___f_1677_, v_a_1678_, v_b_1679_);
return v___x_1681_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__2___boxed(lean_object* v___f_1682_, lean_object* v_a_1683_, lean_object* v_b_1684_){
_start:
{
uint8_t v_res_1685_; lean_object* v_r_1686_; 
v_res_1685_ = lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___lam__2(v___f_1682_, v_a_1683_, v_b_1684_);
v_r_1686_ = lean_box(v_res_1685_);
return v_r_1686_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq(lean_object* v_x_1692_, lean_object* v_x_1693_){
_start:
{
lean_object* v_rule_1694_; lean_object* v_conclusion_1695_; lean_object* v_premises_1696_; lean_object* v_rule_1697_; lean_object* v_conclusion_1698_; lean_object* v_premises_1699_; lean_object* v___f_1700_; uint8_t v___x_1701_; 
v_rule_1694_ = lean_ctor_get(v_x_1692_, 0);
lean_inc(v_rule_1694_);
v_conclusion_1695_ = lean_ctor_get(v_x_1692_, 1);
lean_inc_ref(v_conclusion_1695_);
v_premises_1696_ = lean_ctor_get(v_x_1692_, 2);
lean_inc(v_premises_1696_);
lean_dec_ref(v_x_1692_);
v_rule_1697_ = lean_ctor_get(v_x_1693_, 0);
lean_inc(v_rule_1697_);
v_conclusion_1698_ = lean_ctor_get(v_x_1693_, 1);
lean_inc_ref(v_conclusion_1698_);
v_premises_1699_ = lean_ctor_get(v_x_1693_, 2);
lean_inc(v_premises_1699_);
lean_dec_ref(v_x_1693_);
v___f_1700_ = ((lean_object*)(lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___closed__2));
v___x_1701_ = l_Option_instDecidableEq___redArg(v___f_1700_, v_rule_1694_, v_rule_1697_);
if (v___x_1701_ == 0)
{
lean_dec(v_premises_1699_);
lean_dec_ref(v_conclusion_1698_);
lean_dec(v_premises_1696_);
lean_dec_ref(v_conclusion_1695_);
return v___x_1701_;
}
else
{
uint8_t v___x_1702_; 
v___x_1702_ = lp_algalVerification_Algal_Memory_instDecidableEqTuple_decEq(v_conclusion_1695_, v_conclusion_1698_);
if (v___x_1702_ == 0)
{
lean_dec(v_premises_1699_);
lean_dec(v_premises_1696_);
return v___x_1702_;
}
else
{
lean_object* v___x_1703_; uint8_t v___x_1704_; 
v___x_1703_ = lean_alloc_closure((void*)(l_instDecidableEqNat___boxed), 2, 0);
v___x_1704_ = l_instDecidableEqList___redArg(v___x_1703_, v_premises_1696_, v_premises_1699_);
return v___x_1704_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq___boxed(lean_object* v_x_1705_, lean_object* v_x_1706_){
_start:
{
uint8_t v_res_1707_; lean_object* v_r_1708_; 
v_res_1707_ = lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq(v_x_1705_, v_x_1706_);
v_r_1708_ = lean_box(v_res_1707_);
return v_r_1708_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_instDecidableEqDerivNode(lean_object* v_x_1709_, lean_object* v_x_1710_){
_start:
{
uint8_t v___x_1711_; 
v___x_1711_ = lp_algalVerification_Algal_Memory_instDecidableEqDerivNode_decEq(v_x_1709_, v_x_1710_);
return v___x_1711_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_instDecidableEqDerivNode___boxed(lean_object* v_x_1712_, lean_object* v_x_1713_){
_start:
{
uint8_t v_res_1714_; lean_object* v_r_1715_; 
v_res_1714_ = lp_algalVerification_Algal_Memory_instDecidableEqDerivNode(v_x_1712_, v_x_1713_);
v_r_1715_ = lean_box(v_res_1714_);
return v_r_1715_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_premisesOK(lean_object* v_00_u03c3_1716_, lean_object* v_ds_1717_, lean_object* v_i_1718_, lean_object* v_x_1719_, lean_object* v_x_1720_){
_start:
{
if (lean_obj_tag(v_x_1719_) == 0)
{
lean_dec(v_00_u03c3_1716_);
if (lean_obj_tag(v_x_1720_) == 0)
{
uint8_t v___x_1721_; 
v___x_1721_ = 1;
return v___x_1721_;
}
else
{
uint8_t v___x_1722_; 
lean_dec(v_x_1720_);
v___x_1722_ = 0;
return v___x_1722_;
}
}
else
{
if (lean_obj_tag(v_x_1720_) == 1)
{
lean_object* v_head_1723_; lean_object* v_tail_1724_; lean_object* v_head_1725_; lean_object* v_tail_1726_; uint8_t v___y_1728_; uint8_t v___x_1730_; lean_object* v___x_1731_; 
v_head_1723_ = lean_ctor_get(v_x_1719_, 0);
lean_inc(v_head_1723_);
v_tail_1724_ = lean_ctor_get(v_x_1719_, 1);
lean_inc(v_tail_1724_);
lean_dec_ref_known(v_x_1719_, 2);
v_head_1725_ = lean_ctor_get(v_x_1720_, 0);
lean_inc(v_head_1725_);
v_tail_1726_ = lean_ctor_get(v_x_1720_, 1);
lean_inc(v_tail_1726_);
lean_dec_ref_known(v_x_1720_, 2);
v___x_1730_ = lean_nat_dec_lt(v_head_1725_, v_i_1718_);
v___x_1731_ = l_List_get_x3fInternal___redArg(v_ds_1717_, v_head_1725_);
if (lean_obj_tag(v___x_1731_) == 0)
{
uint8_t v___x_1732_; 
lean_dec(v_tail_1726_);
lean_dec(v_tail_1724_);
lean_dec(v_head_1723_);
lean_dec(v_00_u03c3_1716_);
v___x_1732_ = 0;
return v___x_1732_;
}
else
{
lean_object* v_val_1733_; lean_object* v___x_1735_; uint8_t v_isShared_1736_; uint8_t v_isSharedCheck_1744_; 
v_val_1733_ = lean_ctor_get(v___x_1731_, 0);
v_isSharedCheck_1744_ = !lean_is_exclusive(v___x_1731_);
if (v_isSharedCheck_1744_ == 0)
{
v___x_1735_ = v___x_1731_;
v_isShared_1736_ = v_isSharedCheck_1744_;
goto v_resetjp_1734_;
}
else
{
lean_inc(v_val_1733_);
lean_dec(v___x_1731_);
v___x_1735_ = lean_box(0);
v_isShared_1736_ = v_isSharedCheck_1744_;
goto v_resetjp_1734_;
}
v_resetjp_1734_:
{
lean_object* v_conclusion_1737_; lean_object* v___x_1738_; lean_object* v___x_1739_; lean_object* v___x_1741_; 
v_conclusion_1737_ = lean_ctor_get(v_val_1733_, 1);
lean_inc_ref(v_conclusion_1737_);
lean_dec(v_val_1733_);
v___x_1738_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Memory_instDecidableEqTuple___boxed), 2, 0);
lean_inc(v_00_u03c3_1716_);
v___x_1739_ = lp_algalVerification_Algal_Memory_instLit(v_00_u03c3_1716_, v_head_1723_);
if (v_isShared_1736_ == 0)
{
lean_ctor_set(v___x_1735_, 0, v_conclusion_1737_);
v___x_1741_ = v___x_1735_;
goto v_reusejp_1740_;
}
else
{
lean_object* v_reuseFailAlloc_1743_; 
v_reuseFailAlloc_1743_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1743_, 0, v_conclusion_1737_);
v___x_1741_ = v_reuseFailAlloc_1743_;
goto v_reusejp_1740_;
}
v_reusejp_1740_:
{
uint8_t v___x_1742_; 
v___x_1742_ = l_Option_instDecidableEq___redArg(v___x_1738_, v___x_1739_, v___x_1741_);
if (v___x_1742_ == 0)
{
v___y_1728_ = v___x_1742_;
goto v___jp_1727_;
}
else
{
v___y_1728_ = v___x_1730_;
goto v___jp_1727_;
}
}
}
}
v___jp_1727_:
{
if (v___y_1728_ == 0)
{
lean_dec(v_tail_1726_);
lean_dec(v_tail_1724_);
lean_dec(v_00_u03c3_1716_);
return v___y_1728_;
}
else
{
v_x_1719_ = v_tail_1724_;
v_x_1720_ = v_tail_1726_;
goto _start;
}
}
}
else
{
uint8_t v___x_1745_; 
lean_dec_ref_known(v_x_1719_, 2);
lean_dec(v_x_1720_);
lean_dec(v_00_u03c3_1716_);
v___x_1745_ = 0;
return v___x_1745_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_premisesOK___boxed(lean_object* v_00_u03c3_1746_, lean_object* v_ds_1747_, lean_object* v_i_1748_, lean_object* v_x_1749_, lean_object* v_x_1750_){
_start:
{
uint8_t v_res_1751_; lean_object* v_r_1752_; 
v_res_1751_ = lp_algalVerification_Algal_Memory_premisesOK(v_00_u03c3_1746_, v_ds_1747_, v_i_1748_, v_x_1749_, v_x_1750_);
lean_dec(v_i_1748_);
lean_dec(v_ds_1747_);
v_r_1752_ = lean_box(v_res_1751_);
return v_r_1752_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Memory_nodeValid___closed__0(void){
_start:
{
lean_object* v___x_1753_; lean_object* v___f_1754_; 
v___x_1753_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Memory_instDecidableEqRule___boxed), 2, 0);
v___f_1754_ = lean_alloc_closure((void*)(l_instBEqOfDecidableEq___redArg___lam__0___boxed), 3, 1);
lean_closure_set(v___f_1754_, 0, v___x_1753_);
return v___f_1754_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_nodeValid(lean_object* v_rs_1755_, lean_object* v_fs_1756_, lean_object* v_ds_1757_, lean_object* v_i_1758_, lean_object* v_d_1759_){
_start:
{
lean_object* v_rule_1760_; 
v_rule_1760_ = lean_ctor_get(v_d_1759_, 0);
lean_inc(v_rule_1760_);
if (lean_obj_tag(v_rule_1760_) == 0)
{
lean_object* v_conclusion_1761_; lean_object* v_premises_1762_; uint8_t v___x_1763_; 
lean_dec(v_rs_1755_);
v_conclusion_1761_ = lean_ctor_get(v_d_1759_, 1);
lean_inc_ref(v_conclusion_1761_);
v_premises_1762_ = lean_ctor_get(v_d_1759_, 2);
lean_inc(v_premises_1762_);
lean_dec_ref(v_d_1759_);
v___x_1763_ = l_List_instDecidableEqNil___redArg(v_premises_1762_);
lean_dec(v_premises_1762_);
if (v___x_1763_ == 0)
{
lean_dec_ref(v_conclusion_1761_);
lean_dec(v_fs_1756_);
return v___x_1763_;
}
else
{
lean_object* v___f_1764_; lean_object* v___x_1765_; uint8_t v___x_1766_; 
v___f_1764_ = lean_obj_once(&lp_algalVerification_Algal_Memory_insertAll___at___00Algal_Memory_round_spec__1___closed__0, &lp_algalVerification_Algal_Memory_insertAll___at___00Algal_Memory_round_spec__1___closed__0_once, _init_lp_algalVerification_Algal_Memory_insertAll___at___00Algal_Memory_round_spec__1___closed__0);
v___x_1765_ = lp_algalVerification_Algal_Memory_seed(v_fs_1756_);
v___x_1766_ = l_List_elem___redArg(v___f_1764_, v_conclusion_1761_, v___x_1765_);
return v___x_1766_;
}
}
else
{
lean_object* v_val_1767_; lean_object* v___x_1769_; uint8_t v_isShared_1770_; uint8_t v_isSharedCheck_1788_; 
lean_dec(v_fs_1756_);
v_val_1767_ = lean_ctor_get(v_rule_1760_, 0);
v_isSharedCheck_1788_ = !lean_is_exclusive(v_rule_1760_);
if (v_isSharedCheck_1788_ == 0)
{
v___x_1769_ = v_rule_1760_;
v_isShared_1770_ = v_isSharedCheck_1788_;
goto v_resetjp_1768_;
}
else
{
lean_inc(v_val_1767_);
lean_dec(v_rule_1760_);
v___x_1769_ = lean_box(0);
v_isShared_1770_ = v_isSharedCheck_1788_;
goto v_resetjp_1768_;
}
v_resetjp_1768_:
{
lean_object* v_conclusion_1771_; lean_object* v_premises_1772_; lean_object* v_fst_1773_; lean_object* v_snd_1774_; uint8_t v___y_1776_; lean_object* v___f_1779_; uint8_t v___x_1780_; 
v_conclusion_1771_ = lean_ctor_get(v_d_1759_, 1);
lean_inc_ref(v_conclusion_1771_);
v_premises_1772_ = lean_ctor_get(v_d_1759_, 2);
lean_inc(v_premises_1772_);
lean_dec_ref(v_d_1759_);
v_fst_1773_ = lean_ctor_get(v_val_1767_, 0);
lean_inc_n(v_fst_1773_, 2);
v_snd_1774_ = lean_ctor_get(v_val_1767_, 1);
lean_inc(v_snd_1774_);
lean_dec(v_val_1767_);
v___f_1779_ = lean_obj_once(&lp_algalVerification_Algal_Memory_nodeValid___closed__0, &lp_algalVerification_Algal_Memory_nodeValid___closed__0_once, _init_lp_algalVerification_Algal_Memory_nodeValid___closed__0);
v___x_1780_ = l_List_elem___redArg(v___f_1779_, v_fst_1773_, v_rs_1755_);
if (v___x_1780_ == 0)
{
lean_dec_ref(v_conclusion_1771_);
lean_del_object(v___x_1769_);
v___y_1776_ = v___x_1780_;
goto v___jp_1775_;
}
else
{
lean_object* v_head_1781_; lean_object* v___x_1782_; lean_object* v___x_1783_; lean_object* v___x_1785_; 
v_head_1781_ = lean_ctor_get(v_fst_1773_, 1);
v___x_1782_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Memory_instDecidableEqTuple___boxed), 2, 0);
lean_inc_ref(v_head_1781_);
lean_inc(v_snd_1774_);
v___x_1783_ = lp_algalVerification_Algal_Memory_instLit(v_snd_1774_, v_head_1781_);
if (v_isShared_1770_ == 0)
{
lean_ctor_set(v___x_1769_, 0, v_conclusion_1771_);
v___x_1785_ = v___x_1769_;
goto v_reusejp_1784_;
}
else
{
lean_object* v_reuseFailAlloc_1787_; 
v_reuseFailAlloc_1787_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1787_, 0, v_conclusion_1771_);
v___x_1785_ = v_reuseFailAlloc_1787_;
goto v_reusejp_1784_;
}
v_reusejp_1784_:
{
uint8_t v___x_1786_; 
v___x_1786_ = l_Option_instDecidableEq___redArg(v___x_1782_, v___x_1783_, v___x_1785_);
v___y_1776_ = v___x_1786_;
goto v___jp_1775_;
}
}
v___jp_1775_:
{
if (v___y_1776_ == 0)
{
lean_dec(v_snd_1774_);
lean_dec(v_fst_1773_);
lean_dec(v_premises_1772_);
return v___y_1776_;
}
else
{
lean_object* v_body_1777_; uint8_t v___x_1778_; 
v_body_1777_ = lean_ctor_get(v_fst_1773_, 2);
lean_inc(v_body_1777_);
lean_dec(v_fst_1773_);
v___x_1778_ = lp_algalVerification_Algal_Memory_premisesOK(v_snd_1774_, v_ds_1757_, v_i_1758_, v_body_1777_, v_premises_1772_);
return v___x_1778_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_nodeValid___boxed(lean_object* v_rs_1789_, lean_object* v_fs_1790_, lean_object* v_ds_1791_, lean_object* v_i_1792_, lean_object* v_d_1793_){
_start:
{
uint8_t v_res_1794_; lean_object* v_r_1795_; 
v_res_1794_ = lp_algalVerification_Algal_Memory_nodeValid(v_rs_1789_, v_fs_1790_, v_ds_1791_, v_i_1792_, v_d_1793_);
lean_dec(v_i_1792_);
lean_dec(v_ds_1791_);
v_r_1795_ = lean_box(v_res_1794_);
return v_r_1795_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_validFrom(lean_object* v_rs_1796_, lean_object* v_fs_1797_, lean_object* v_ds_1798_, lean_object* v_x_1799_, lean_object* v_x_1800_){
_start:
{
if (lean_obj_tag(v_x_1800_) == 0)
{
uint8_t v___x_1801_; 
lean_dec(v_x_1799_);
lean_dec(v_fs_1797_);
lean_dec(v_rs_1796_);
v___x_1801_ = 1;
return v___x_1801_;
}
else
{
lean_object* v_head_1802_; lean_object* v_tail_1803_; uint8_t v___x_1804_; 
v_head_1802_ = lean_ctor_get(v_x_1800_, 0);
lean_inc(v_head_1802_);
v_tail_1803_ = lean_ctor_get(v_x_1800_, 1);
lean_inc(v_tail_1803_);
lean_dec_ref_known(v_x_1800_, 2);
lean_inc(v_fs_1797_);
lean_inc(v_rs_1796_);
v___x_1804_ = lp_algalVerification_Algal_Memory_nodeValid(v_rs_1796_, v_fs_1797_, v_ds_1798_, v_x_1799_, v_head_1802_);
if (v___x_1804_ == 0)
{
lean_dec(v_tail_1803_);
lean_dec(v_x_1799_);
lean_dec(v_fs_1797_);
lean_dec(v_rs_1796_);
return v___x_1804_;
}
else
{
lean_object* v___x_1805_; lean_object* v___x_1806_; 
v___x_1805_ = lean_unsigned_to_nat(1u);
v___x_1806_ = lean_nat_add(v_x_1799_, v___x_1805_);
lean_dec(v_x_1799_);
v_x_1799_ = v___x_1806_;
v_x_1800_ = v_tail_1803_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_validFrom___boxed(lean_object* v_rs_1808_, lean_object* v_fs_1809_, lean_object* v_ds_1810_, lean_object* v_x_1811_, lean_object* v_x_1812_){
_start:
{
uint8_t v_res_1813_; lean_object* v_r_1814_; 
v_res_1813_ = lp_algalVerification_Algal_Memory_validFrom(v_rs_1808_, v_fs_1809_, v_ds_1810_, v_x_1811_, v_x_1812_);
lean_dec(v_ds_1810_);
v_r_1814_ = lean_box(v_res_1813_);
return v_r_1814_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Memory_valid(lean_object* v_rs_1815_, lean_object* v_fs_1816_, lean_object* v_ds_1817_){
_start:
{
lean_object* v___x_1818_; uint8_t v___x_1819_; 
v___x_1818_ = lean_unsigned_to_nat(0u);
lean_inc(v_ds_1817_);
v___x_1819_ = lp_algalVerification_Algal_Memory_validFrom(v_rs_1815_, v_fs_1816_, v_ds_1817_, v___x_1818_, v_ds_1817_);
lean_dec(v_ds_1817_);
return v___x_1819_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Memory_valid___boxed(lean_object* v_rs_1820_, lean_object* v_fs_1821_, lean_object* v_ds_1822_){
_start:
{
uint8_t v_res_1823_; lean_object* v_r_1824_; 
v_res_1823_ = lp_algalVerification_Algal_Memory_valid(v_rs_1820_, v_fs_1821_, v_ds_1822_);
v_r_1824_ = lean_box(v_res_1823_);
return v_r_1824_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_validFrom_match__1_splitter___redArg(lean_object* v_x_1825_, lean_object* v_x_1826_, lean_object* v_h__1_1827_, lean_object* v_h__2_1828_){
_start:
{
if (lean_obj_tag(v_x_1826_) == 0)
{
lean_object* v___x_1829_; 
lean_dec(v_h__2_1828_);
v___x_1829_ = lean_apply_1(v_h__1_1827_, v_x_1825_);
return v___x_1829_;
}
else
{
lean_object* v_head_1830_; lean_object* v_tail_1831_; lean_object* v___x_1832_; 
lean_dec(v_h__1_1827_);
v_head_1830_ = lean_ctor_get(v_x_1826_, 0);
lean_inc(v_head_1830_);
v_tail_1831_ = lean_ctor_get(v_x_1826_, 1);
lean_inc(v_tail_1831_);
lean_dec_ref_known(v_x_1826_, 2);
v___x_1832_ = lean_apply_3(v_h__2_1828_, v_x_1825_, v_head_1830_, v_tail_1831_);
return v___x_1832_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_validFrom_match__1_splitter(lean_object* v_motive_1833_, lean_object* v_x_1834_, lean_object* v_x_1835_, lean_object* v_h__1_1836_, lean_object* v_h__2_1837_){
_start:
{
if (lean_obj_tag(v_x_1835_) == 0)
{
lean_object* v___x_1838_; 
lean_dec(v_h__2_1837_);
v___x_1838_ = lean_apply_1(v_h__1_1836_, v_x_1834_);
return v___x_1838_;
}
else
{
lean_object* v_head_1839_; lean_object* v_tail_1840_; lean_object* v___x_1841_; 
lean_dec(v_h__1_1836_);
v_head_1839_ = lean_ctor_get(v_x_1835_, 0);
lean_inc(v_head_1839_);
v_tail_1840_ = lean_ctor_get(v_x_1835_, 1);
lean_inc(v_tail_1840_);
lean_dec_ref_known(v_x_1835_, 2);
v___x_1841_ = lean_apply_3(v_h__2_1837_, v_x_1834_, v_head_1839_, v_tail_1840_);
return v___x_1841_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_premisesOK_match__3_splitter___redArg(lean_object* v_x_1842_, lean_object* v_x_1843_, lean_object* v_h__1_1844_, lean_object* v_h__2_1845_, lean_object* v_h__3_1846_){
_start:
{
if (lean_obj_tag(v_x_1842_) == 0)
{
lean_dec(v_h__2_1845_);
if (lean_obj_tag(v_x_1843_) == 0)
{
lean_object* v___x_1847_; lean_object* v___x_1848_; 
lean_dec(v_h__3_1846_);
v___x_1847_ = lean_box(0);
v___x_1848_ = lean_apply_1(v_h__1_1844_, v___x_1847_);
return v___x_1848_;
}
else
{
lean_object* v___x_1849_; 
lean_dec(v_h__1_1844_);
v___x_1849_ = lean_apply_4(v_h__3_1846_, v_x_1842_, v_x_1843_, lean_box(0), lean_box(0));
return v___x_1849_;
}
}
else
{
lean_dec(v_h__1_1844_);
if (lean_obj_tag(v_x_1843_) == 1)
{
lean_object* v_head_1850_; lean_object* v_tail_1851_; lean_object* v_head_1852_; lean_object* v_tail_1853_; lean_object* v___x_1854_; 
lean_dec(v_h__3_1846_);
v_head_1850_ = lean_ctor_get(v_x_1842_, 0);
lean_inc(v_head_1850_);
v_tail_1851_ = lean_ctor_get(v_x_1842_, 1);
lean_inc(v_tail_1851_);
lean_dec_ref_known(v_x_1842_, 2);
v_head_1852_ = lean_ctor_get(v_x_1843_, 0);
lean_inc(v_head_1852_);
v_tail_1853_ = lean_ctor_get(v_x_1843_, 1);
lean_inc(v_tail_1853_);
lean_dec_ref_known(v_x_1843_, 2);
v___x_1854_ = lean_apply_4(v_h__2_1845_, v_head_1850_, v_tail_1851_, v_head_1852_, v_tail_1853_);
return v___x_1854_;
}
else
{
lean_object* v___x_1855_; 
lean_dec(v_h__2_1845_);
v___x_1855_ = lean_apply_4(v_h__3_1846_, v_x_1842_, v_x_1843_, lean_box(0), lean_box(0));
return v___x_1855_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_premisesOK_match__3_splitter(lean_object* v_motive_1856_, lean_object* v_x_1857_, lean_object* v_x_1858_, lean_object* v_h__1_1859_, lean_object* v_h__2_1860_, lean_object* v_h__3_1861_){
_start:
{
if (lean_obj_tag(v_x_1857_) == 0)
{
lean_dec(v_h__2_1860_);
if (lean_obj_tag(v_x_1858_) == 0)
{
lean_object* v___x_1862_; lean_object* v___x_1863_; 
lean_dec(v_h__3_1861_);
v___x_1862_ = lean_box(0);
v___x_1863_ = lean_apply_1(v_h__1_1859_, v___x_1862_);
return v___x_1863_;
}
else
{
lean_object* v___x_1864_; 
lean_dec(v_h__1_1859_);
v___x_1864_ = lean_apply_4(v_h__3_1861_, v_x_1857_, v_x_1858_, lean_box(0), lean_box(0));
return v___x_1864_;
}
}
else
{
lean_dec(v_h__1_1859_);
if (lean_obj_tag(v_x_1858_) == 1)
{
lean_object* v_head_1865_; lean_object* v_tail_1866_; lean_object* v_head_1867_; lean_object* v_tail_1868_; lean_object* v___x_1869_; 
lean_dec(v_h__3_1861_);
v_head_1865_ = lean_ctor_get(v_x_1857_, 0);
lean_inc(v_head_1865_);
v_tail_1866_ = lean_ctor_get(v_x_1857_, 1);
lean_inc(v_tail_1866_);
lean_dec_ref_known(v_x_1857_, 2);
v_head_1867_ = lean_ctor_get(v_x_1858_, 0);
lean_inc(v_head_1867_);
v_tail_1868_ = lean_ctor_get(v_x_1858_, 1);
lean_inc(v_tail_1868_);
lean_dec_ref_known(v_x_1858_, 2);
v___x_1869_ = lean_apply_4(v_h__2_1860_, v_head_1865_, v_tail_1866_, v_head_1867_, v_tail_1868_);
return v___x_1869_;
}
else
{
lean_object* v___x_1870_; 
lean_dec(v_h__2_1860_);
v___x_1870_ = lean_apply_4(v_h__3_1861_, v_x_1857_, v_x_1858_, lean_box(0), lean_box(0));
return v___x_1870_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_premisesOK_match__1_splitter___redArg(lean_object* v_x_1871_, lean_object* v_h__1_1872_, lean_object* v_h__2_1873_){
_start:
{
if (lean_obj_tag(v_x_1871_) == 0)
{
lean_object* v___x_1874_; lean_object* v___x_1875_; 
lean_dec(v_h__1_1872_);
v___x_1874_ = lean_box(0);
v___x_1875_ = lean_apply_1(v_h__2_1873_, v___x_1874_);
return v___x_1875_;
}
else
{
lean_object* v_val_1876_; lean_object* v___x_1877_; 
lean_dec(v_h__2_1873_);
v_val_1876_ = lean_ctor_get(v_x_1871_, 0);
lean_inc(v_val_1876_);
lean_dec_ref_known(v_x_1871_, 1);
v___x_1877_ = lean_apply_1(v_h__1_1872_, v_val_1876_);
return v___x_1877_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Memory_Datalog_0__Algal_Memory_premisesOK_match__1_splitter(lean_object* v_motive_1878_, lean_object* v_x_1879_, lean_object* v_h__1_1880_, lean_object* v_h__2_1881_){
_start:
{
if (lean_obj_tag(v_x_1879_) == 0)
{
lean_object* v___x_1882_; lean_object* v___x_1883_; 
lean_dec(v_h__1_1880_);
v___x_1882_ = lean_box(0);
v___x_1883_ = lean_apply_1(v_h__2_1881_, v___x_1882_);
return v___x_1883_;
}
else
{
lean_object* v_val_1884_; lean_object* v___x_1885_; 
lean_dec(v_h__2_1881_);
v_val_1884_ = lean_ctor_get(v_x_1879_, 0);
lean_inc(v_val_1884_);
lean_dec_ref_known(v_x_1879_, 1);
v___x_1885_ = lean_apply_1(v_h__1_1880_, v_val_1884_);
return v___x_1885_;
}
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Memory_Datalog(uint8_t builtin) {
lean_object * res;
if (_G_initialized) return lean_io_result_mk_ok(lean_box(0));
_G_initialized = true;
lean_initialize_runtime_module();
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
