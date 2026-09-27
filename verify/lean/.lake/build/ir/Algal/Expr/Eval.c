// Lean compiler output
// Module: Algal.Expr.Eval
// Imports: public import Init public meta import Init public import Algal.Expr.Model
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
lean_object* lp_algalVerification_Algal_Expr_errArity(lean_object*, lean_object*, lean_object*);
lean_object* l_List_appendTR___redArg(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Expr_checkValue(lean_object*);
lean_object* lp_algalVerification_Algal_Expr_fieldsLength(lean_object*);
uint8_t lean_nat_dec_lt(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Expr_sortFieldsByte(lean_object*);
lean_object* lp_algalVerification_Algal_Expr_errBounds(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Expr_itemsLength(lean_object*);
uint8_t lean_string_dec_eq(lean_object*, lean_object*);
lean_object* lean_nat_add(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Expr_err(uint8_t);
lean_object* lp_algalVerification_Algal_Expr_errOp(lean_object*);
lean_object* lp_algalVerification_Algal_Expr_errUnmodeled(lean_object*);
lean_object* l_Nat_reprFast(lean_object*);
lean_object* lean_string_append(lean_object*, lean_object*);
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Core_Normalize_fieldsToList(lean_object*);
lean_object* lp_algalVerification_Algal_Core_Normalize_fieldsOfList(lean_object*);
lean_object* lp_algalVerification_Algal_Expr_fieldNames(lean_object*);
lean_object* lp_algalVerification_List_eraseDups___at___00Algal_Core_KeyOrder_support_spec__1(lean_object*);
lean_object* l_List_lengthTR___redArg(lean_object*);
lean_object* lp_algalVerification_Algal_Expr_kindOf(lean_object*);
lean_object* lp_algalVerification_Algal_Expr_errType(lean_object*, lean_object*, lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Core_Normalize_canonicalFields(lean_object*);
lean_object* lp_algalVerification_Algal_Core_Text_canonicalKeys(lean_object*);
lean_object* l_List_reverse___redArg(lean_object*);
lean_object* lp_algalVerification_Algal_Core_Normalize_lookupFields(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Expr_itemsFromList(lean_object*);
uint8_t lp_algalVerification_Algal_Expr_fhas(lean_object*, lean_object*);
lean_object* lean_string_utf8_byte_size(lean_object*);
lean_object* lean_string_data(lean_object*);
uint8_t lp_algalVerification_List_isPrefixOf___at___00Algal_Expr_charInfix_spec__0(lean_object*, lean_object*);
uint8_t lp_algalVerification_Algal_Expr_charInfix(lean_object*, lean_object*);
lean_object* lean_nat_sub(lean_object*, lean_object*);
lean_object* lean_nat_mul(lean_object*, lean_object*);
uint8_t l_List_instDecidableEqNil___redArg(lean_object*);
lean_object* lp_algalVerification_Algal_Expr_splitChars___redArg(lean_object*, lean_object*);
lean_object* lean_string_mk(lean_object*);
lean_object* lp_algalVerification_Algal_Expr_errArg(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Expr_trimStr(lean_object*);
lean_object* lp_algalVerification_Algal_Expr_lowerStr(lean_object*);
lean_object* lp_algalVerification_Algal_Expr_upperStr(lean_object*);
lean_object* lp_algalVerification_Algal_Core_Text_utf16(lean_object*);
uint64_t lp_algalVerification_Algal_Expr_numberOfNat(lean_object*);
uint8_t lp_algalVerification_Algal_Expr_eqv(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Expr_itemsAppend(lean_object*, lean_object*);
double lean_float_of_bits(uint64_t);
double lean_float_of_nat(lean_object*);
uint8_t lean_float_decLe(double, double);
double floor(double);
double lean_float_sub(double, double);
uint8_t lean_float_beq(double, double);
lean_object* lp_algalVerification_Algal_Expr_itemsDropF(lean_object*, double);
lean_object* lp_algalVerification_Algal_Expr_itemsTakeF(lean_object*, double);
lean_object* lp_algalVerification_Algal_Expr_itemsReverse(lean_object*);
lean_object* lp_algalVerification_Algal_Expr_itemsGetF(lean_object*, double);
lean_object* lp_algalVerification_Algal_Expr_errNthRange(lean_object*, double, lean_object*);
lean_object* lp_algalVerification_Algal_Expr_lookupName(lean_object*, lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Expr_errPathWhat(lean_object*, lean_object*);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Expr_countNodes(lean_object*);
uint8_t lean_float_decLt(double, double);
uint8_t lp_algalVerification_Algal_Expr_utf16compare(lean_object*, lean_object*);
double lp_algalVerification_Algal_Expr_fmax(double, double);
double lp_algalVerification_Algal_Expr_fmin(double, double);
lean_object* lp_algalVerification_Algal_Expr_admitNum(double);
lean_object* lp_algalVerification_Algal_Expr_errNum(lean_object*);
double lp_algalVerification_Algal_Expr_jsRound(double);
double ceil(double);
double fabs(double);
double lean_float_negate(double);
double lean_float_div(double, double);
double lean_float_mul(double, double);
double lean_float_add(double, double);
lean_object* lp_algalVerification_Algal_Expr_valueBytes(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Expr_addValueBytes(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Expr_canonicalizeAcc(lean_object*);
lean_object* lp_algalVerification_Algal_Expr_stringBytes(lean_object*);
lean_object* l_Function_const___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(lean_object*, lean_object*);
uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__2(lean_object*, lean_object*);
uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__3(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Expr_envBytes(lean_object*);
lean_object* lp_algalVerification_Algal_Expr_envDepth(lean_object*);
lean_object* lp_algalVerification_Algal_Expr_valueByteCount(lean_object*);
lean_object* lp_algalVerification_Algal_Expr_valueDepth(lean_object*);
lean_object* lp_algalVerification_Algal_Expr_numVal(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__0(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__1(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__2(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__3(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__4(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__5(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__5___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__6(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__7(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__8(lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Expr_instMonadR___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Expr_instMonadR___lam__0, .m_arity = 4, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Expr_instMonadR___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__0_value;
static const lean_closure_object lp_algalVerification_Algal_Expr_instMonadR___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*1, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Expr_instMonadR___lam__1, .m_arity = 5, .m_num_fixed = 1, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__0_value)} };
static const lean_object* lp_algalVerification_Algal_Expr_instMonadR___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__1_value;
static const lean_closure_object lp_algalVerification_Algal_Expr_instMonadR___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Expr_instMonadR___lam__2, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Expr_instMonadR___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__2_value;
static const lean_closure_object lp_algalVerification_Algal_Expr_instMonadR___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Expr_instMonadR___lam__3, .m_arity = 4, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Expr_instMonadR___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__3_value;
static const lean_closure_object lp_algalVerification_Algal_Expr_instMonadR___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Expr_instMonadR___lam__4, .m_arity = 4, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Expr_instMonadR___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__4_value;
static const lean_closure_object lp_algalVerification_Algal_Expr_instMonadR___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*2, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Expr_instMonadR___lam__7, .m_arity = 6, .m_num_fixed = 2, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__2_value),((lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__4_value)} };
static const lean_object* lp_algalVerification_Algal_Expr_instMonadR___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__5_value;
static const lean_closure_object lp_algalVerification_Algal_Expr_instMonadR___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Expr_instMonadR___lam__8, .m_arity = 4, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Expr_instMonadR___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__6_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_instMonadR___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__0_value),((lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__1_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_instMonadR___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__7_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_instMonadR___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*5 + 0, .m_other = 5, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__7_value),((lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__2_value),((lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__3_value),((lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__5_value),((lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__6_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_instMonadR___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__8_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_instMonadR___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__8_value),((lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_instMonadR___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__9_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Expr_instMonadR = (const lean_object*)&lp_algalVerification_Algal_Expr_instMonadR___closed__9_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_charge___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Expr_charge___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_charge___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_charge(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fail___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fail(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_failWith___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_failWith(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_charged___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_charged(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_liftE___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_liftE(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_postCheck(lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_asNum___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "number"};
static const lean_object* lp_algalVerification_Algal_Expr_asNum___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_asNum___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asNum(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asNum___boxed(lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_asBool___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "bool"};
static const lean_object* lp_algalVerification_Algal_Expr_asBool___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_asBool___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asBool(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asBool___boxed(lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_asList___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "list"};
static const lean_object* lp_algalVerification_Algal_Expr_asList___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_asList___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asList(lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_asMap___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "map"};
static const lean_object* lp_algalVerification_Algal_Expr_asMap___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_asMap___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asMap(lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_asStr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "string"};
static const lean_object* lp_algalVerification_Algal_Expr_asStr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_asStr___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asStr(lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_asIndex___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 15, .m_capacity = 15, .m_length = 14, .m_data = "nonneg integer"};
static const lean_object* lp_algalVerification_Algal_Expr_asIndex___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_asIndex___closed__0_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_asIndex___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static double lp_algalVerification_Algal_Expr_asIndex___closed__1;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asIndex(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asIndex___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_emitNum(lean_object*, double);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_emitNum___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_binderName___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 1, .m_capacity = 1, .m_length = 0, .m_data = ""};
static const lean_object* lp_algalVerification_Algal_Expr_binderName___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_binderName___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_binderName(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_binderName___boxed(lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_arityWant___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = ".."};
static const lean_object* lp_algalVerification_Algal_Expr_arityWant___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_arityWant___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_arityWant(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Expr_checkArity___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_charge___closed__0_value),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Expr_checkArity___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_checkArity___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_checkArity(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_checkArity___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_baseCost___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "and"};
static const lean_object* lp_algalVerification_Algal_Expr_baseCost___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_baseCost___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Expr_baseCost___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "or"};
static const lean_object* lp_algalVerification_Algal_Expr_baseCost___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Expr_baseCost___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Expr_baseCost___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "not"};
static const lean_object* lp_algalVerification_Algal_Expr_baseCost___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Expr_baseCost___closed__2_value;
static const lean_string_object lp_algalVerification_Algal_Expr_baseCost___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "if"};
static const lean_object* lp_algalVerification_Algal_Expr_baseCost___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Expr_baseCost___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Expr_baseCost___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "let"};
static const lean_object* lp_algalVerification_Algal_Expr_baseCost___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Expr_baseCost___closed__4_value;
static const lean_string_object lp_algalVerification_Algal_Expr_baseCost___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "quote"};
static const lean_object* lp_algalVerification_Algal_Expr_baseCost___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Expr_baseCost___closed__5_value;
static const lean_string_object lp_algalVerification_Algal_Expr_baseCost___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "isText"};
static const lean_object* lp_algalVerification_Algal_Expr_baseCost___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Expr_baseCost___closed__6_value;
static const lean_string_object lp_algalVerification_Algal_Expr_baseCost___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "isNum"};
static const lean_object* lp_algalVerification_Algal_Expr_baseCost___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Expr_baseCost___closed__7_value;
static const lean_string_object lp_algalVerification_Algal_Expr_baseCost___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "isBool"};
static const lean_object* lp_algalVerification_Algal_Expr_baseCost___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Expr_baseCost___closed__8_value;
static const lean_string_object lp_algalVerification_Algal_Expr_baseCost___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "isList"};
static const lean_object* lp_algalVerification_Algal_Expr_baseCost___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Expr_baseCost___closed__9_value;
static const lean_string_object lp_algalVerification_Algal_Expr_baseCost___closed__10_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "isMap"};
static const lean_object* lp_algalVerification_Algal_Expr_baseCost___closed__10 = (const lean_object*)&lp_algalVerification_Algal_Expr_baseCost___closed__10_value;
static const lean_string_object lp_algalVerification_Algal_Expr_baseCost___closed__11_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "isNull"};
static const lean_object* lp_algalVerification_Algal_Expr_baseCost___closed__11 = (const lean_object*)&lp_algalVerification_Algal_Expr_baseCost___closed__11_value;
static const lean_string_object lp_algalVerification_Algal_Expr_baseCost___closed__12_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "get"};
static const lean_object* lp_algalVerification_Algal_Expr_baseCost___closed__12 = (const lean_object*)&lp_algalVerification_Algal_Expr_baseCost___closed__12_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_baseCost(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_baseCost___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_numFold(lean_object*, lean_object*, double, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_numFold___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Expr_minMaxFold___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_minMaxFold___closed__0;
static lean_once_cell_t lp_algalVerification_Algal_Expr_minMaxFold___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_minMaxFold___closed__1;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_minMaxFold(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_minMaxFold___boxed(lean_object*, lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Expr_containsLoop___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Expr_containsLoop___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_containsLoop___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_containsLoop___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(1) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Expr_containsLoop___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Expr_containsLoop___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_containsLoop(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_uniqueSeen(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_uniqueLoop(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_listCount(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_listCount___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_listsOnto(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_listsOnto___boxed(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Expr_strFold___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Expr_strFold___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_strFold___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_strFold(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_joinStrs_spec__0(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_joinStrs_spec__0___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_joinStrs(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_joinStrs___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_mergeLoop___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 12, .m_capacity = 12, .m_length = 11, .m_data = "object-keys"};
static const lean_object* lp_algalVerification_Algal_Expr_mergeLoop___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_mergeLoop___closed__0_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_mergeLoop___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_mergeLoop___closed__1;
static lean_once_cell_t lp_algalVerification_Algal_Expr_mergeLoop___closed__2_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_mergeLoop___closed__2;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_mergeLoop(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_ctorIdx(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_ctorElim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_node_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_node_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_args_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_args_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_objFields_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_objFields_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_bools_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_bools_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_getPath_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_getPath_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_mapFilt_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_mapFilt_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_fold_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_fold_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_instDecidableEqWork_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instDecidableEqWork_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_instDecidableEqWork(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instDecidableEqWork___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsMeasure(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_valueMeasure(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsMeasure(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsMeasure___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsMeasure___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_valueMeasure___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_workMeasure(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_workMeasure___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_fieldsLength_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_fieldsLength_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_fieldsMeasure_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_fieldsMeasure_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT double lp_algalVerification_Algal_Expr_machine___lam__0(uint8_t, double, double);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__0___boxed(lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__7___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 27, .m_capacity = 27, .m_length = 26, .m_data = "two numbers or two strings"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__7___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__7___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__7___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 2, .m_capacity = 2, .m_length = 1, .m_data = ","};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__7___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__7___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__7(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__7___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Expr_machine___lam__6___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_machine___lam__6___closed__0;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__6(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__6___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_machine_spec__4(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_machine_spec__0(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_machine_spec__0___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_machine_spec__1(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_machine_spec__3(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_machine_spec__3___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__24___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "5..5"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__24___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__24___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__24(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__24___boxed(lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__22___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "1..1"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__22___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__22___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__22(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__22___boxed(lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__21___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "3..3"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__21___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__21___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__21(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__21___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_isSuffixOf___at___00Algal_Expr_machine_spec__2(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_isSuffixOf___at___00Algal_Expr_machine_spec__2___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__18___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "2..2"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__18___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__18___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__18(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__18___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_machine_spec__5(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_machine_spec__5___boxed(lean_object*, lean_object*);
LEAN_EXPORT double lp_algalVerification_Algal_Expr_machine___lam__3(uint8_t, double, double);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__3___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__17(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__9___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "1.."};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__9___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__9___closed__0_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_machine___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_machine___closed__0;
static lean_once_cell_t lp_algalVerification_Algal_Expr_machine___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_machine___closed__1;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 25, .m_capacity = 25, .m_length = 24, .m_data = "op head must be a string"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__3_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_machine___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__3_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__4_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "what"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_machine___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__2_value),((lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__5_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_machine___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__5_value),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__6_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_machine___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 8, .m_other = 1, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__6_value),LEAN_SCALAR_PTR_LITERAL(0, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__7_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_machine___closed__8_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_machine___closed__8;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__1___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "add"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__1___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__1___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "mul"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__9_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__10_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "sub"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__10 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__10_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__2___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "div"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__2___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__2___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__11_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "neg"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__11 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__11_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__4___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "min"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__4___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__4___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__12_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "max"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__12 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__12_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__5___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "abs"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__5___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__5___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__5___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "floor"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__5___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__5___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__5___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "ceil"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__5___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__5___closed__2_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__13_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "round"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__13 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__13_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__14_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "clamp"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__14 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__14_value;
static const lean_closure_object lp_algalVerification_Algal_Expr_machine___closed__15_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Expr_machine___lam__6___boxed, .m_arity = 1, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__15 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__15_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__8___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "lt"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__8___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__8___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__8___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "lte"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__8___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__8___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__8___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "gt"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__8___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__8___closed__2_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__8___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "gte"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__8___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__8___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__10___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "eq"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__10___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__10___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__16_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "neq"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__16 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__16_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__17_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "len"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__17 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__17_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__18_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "nth"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__18 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__18_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__19_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "concat"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__19 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__19_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__20_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "filter"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__20 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__20_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__21_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "fold"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__21 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__21_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__22_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 9, .m_capacity = 9, .m_length = 8, .m_data = "contains"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__22 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__22_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__23_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 8, .m_capacity = 8, .m_length = 7, .m_data = "reverse"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__23 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__23_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__12___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "take"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__12___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__12___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__24_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "drop"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__24 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__24_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__25_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "flat"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__25 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__25_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__26_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "unique"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__26 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__26_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__27_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "slen"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__27 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__27_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__28_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 8, .m_capacity = 8, .m_length = 7, .m_data = "sconcat"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__28 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__28_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__13___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "upper"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__13___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__13___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__13___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "lower"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__13___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__13___closed__4_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__29_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "trim"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__29 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__29_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__30_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "split"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__30 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__30_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__31_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "join"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__31 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__31_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__32_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 10, .m_capacity = 10, .m_length = 9, .m_data = "scontains"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__32 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__32_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__14___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "starts"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__14___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__14___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__33_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "ends"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__33 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__33_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__34_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "has"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__34 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__34_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__15___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "keys"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__15___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__15___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__35_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "values"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__35 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__35_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__36_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "merge"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__36 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__36_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__37_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "sort"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__37 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__37_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__38_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "toText"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__38 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__38_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__39_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "mod"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__39 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__39_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__16(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__15(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Expr_machine___lam__4___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_machine___lam__4___closed__1;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__14(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__13___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 13, .m_capacity = 13, .m_length = 12, .m_data = "string-bytes"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__13___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__13___closed__0_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_machine___lam__13___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_machine___lam__13___closed__1;
static lean_once_cell_t lp_algalVerification_Algal_Expr_machine___lam__13___closed__2_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_machine___lam__13___closed__2;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__40_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 9, .m_capacity = 9, .m_length = 8, .m_data = "list-len"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__40 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__40_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_machine___closed__41_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_machine___closed__41;
static lean_once_cell_t lp_algalVerification_Algal_Expr_machine___closed__42_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_machine___closed__42;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__43_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 28, .m_capacity = 28, .m_length = 27, .m_data = "separator must be non-empty"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__43 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__43_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__13(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__12(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__11(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__44_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 15, .m_capacity = 15, .m_length = 14, .m_data = "unbound name \""};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__44 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__44_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__45_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 2, .m_capacity = 2, .m_length = 1, .m_data = "\""};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__45 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__45_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__46_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 12, .m_capacity = 12, .m_length = 11, .m_data = "name string"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__46 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__46_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_machine___lam__10___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(2) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__10___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__10___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__10(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__8(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__47_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 23, .m_capacity = 23, .m_length = 22, .m_data = "clamp lo must be <= hi"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__47 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__47_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__5(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__4(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_machine___lam__2___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "op"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___lam__2___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___lam__2___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__2(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Expr_machine___lam__1___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static double lp_algalVerification_Algal_Expr_machine___lam__1___closed__1;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__1(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__48_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "got"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__48 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__48_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__49_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 21, .m_capacity = 21, .m_length = 20, .m_data = "nonneg integer index"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__49 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__49_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_machine___closed__50_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__50 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__50_value;
static const lean_string_object lp_algalVerification_Algal_Expr_machine___closed__51_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 35, .m_capacity = 35, .m_length = 34, .m_data = "string key or nonneg integer index"};
static const lean_object* lp_algalVerification_Algal_Expr_machine___closed__51 = (const lean_object*)&lp_algalVerification_Algal_Expr_machine___closed__51_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__9(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__9___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__11___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__16___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__4___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__15___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__1___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__5___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__12___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__13___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__10___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__14___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__2___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__8___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__44_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__44_splitter___redArg___boxed(lean_object**);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__44_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__44_splitter___boxed(lean_object**);
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "add"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__0 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__0_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "mul"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__1 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__1_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "sub"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__2 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__2_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "div"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__3 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__3_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "neg"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__4 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__4_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "min"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__5 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__5_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "max"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__6 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__6_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "abs"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__7 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__7_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "floor"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__8 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__8_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "ceil"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__9 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__9_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__10_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "round"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__10 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__10_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__11_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "clamp"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__11 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__11_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__12_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "lt"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__12 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__12_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__13_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "lte"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__13 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__13_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__14_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "gt"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__14 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__14_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__15_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "gte"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__15 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__15_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__16_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "eq"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__16 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__16_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__17_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "neq"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__17 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__17_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__18_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "len"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__18 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__18_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__19_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "nth"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__19 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__19_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__20_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "concat"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__20 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__20_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__21_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "filter"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__21 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__21_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__22_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "fold"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__22 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__22_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__23_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 9, .m_capacity = 9, .m_length = 8, .m_data = "contains"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__23 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__23_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__24_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 8, .m_capacity = 8, .m_length = 7, .m_data = "reverse"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__24 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__24_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__25_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "take"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__25 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__25_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__26_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "drop"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__26 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__26_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__27_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "flat"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__27 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__27_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__28_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "unique"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__28 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__28_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__29_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "slen"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__29 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__29_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__30_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 8, .m_capacity = 8, .m_length = 7, .m_data = "sconcat"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__30 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__30_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__31_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "upper"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__31 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__31_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__32_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "lower"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__32 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__32_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__33_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "trim"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__33 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__33_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__34_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "split"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__34 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__34_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__35_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "join"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__35 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__35_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__36_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 10, .m_capacity = 10, .m_length = 9, .m_data = "scontains"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__36 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__36_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__37_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "starts"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__37 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__37_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__38_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "ends"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__38 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__38_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__39_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "has"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__39 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__39_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__40_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "keys"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__40 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__40_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__41_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "values"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__41 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__41_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__42_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "merge"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__42 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__42_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__43_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "sort"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__43 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__43_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__44_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "toText"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__44 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__44_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__45_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "mod"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__45 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__45_value;
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___boxed(lean_object**);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___boxed(lean_object**);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_asList_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_asList_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__5_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__5_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter___redArg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "abs"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter___redArg___closed__0 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter___redArg___closed__0_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter___redArg___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "floor"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter___redArg___closed__1 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter___redArg___closed__1_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter___redArg___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "ceil"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter___redArg___closed__2 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter___redArg___closed__2_value;
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__9_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__9_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__18_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__18_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__15_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__15_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter___redArg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "lt"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter___redArg___closed__0 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter___redArg___closed__0_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter___redArg___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "lte"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter___redArg___closed__1 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter___redArg___closed__1_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter___redArg___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "gt"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter___redArg___closed__2 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter___redArg___closed__2_value;
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__13_splitter___redArg(uint8_t, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__13_splitter___redArg___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__13_splitter(lean_object*, uint8_t, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__13_splitter___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__22_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__22_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_asStr_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_asStr_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__20_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__20_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__24_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__24_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_containsLoop_match__1_splitter___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_containsLoop_match__1_splitter(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_uniqueLoop_match__1_splitter___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_uniqueLoop_match__1_splitter(lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__26_splitter___redArg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "upper"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__26_splitter___redArg___closed__0 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__26_splitter___redArg___closed__0_value;
static const lean_string_object lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__26_splitter___redArg___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "lower"};
static const lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__26_splitter___redArg___closed__1 = (const lean_object*)&lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__26_splitter___redArg___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__26_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__26_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_mergeLoop_match__1_splitter___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_mergeLoop_match__1_splitter(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__28_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__28_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__30_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__30_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__34_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__34_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__36_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__36_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_asBool_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_asBool_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__39_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__39_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_asMap_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_asMap_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__42_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__42_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_eval(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_eval___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_instDecidableEqFuelFailure_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instDecidableEqFuelFailure_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_instDecidableEqFuelFailure(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instDecidableEqFuelFailure___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_replay(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_fuelErr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "cost"};
static const lean_object* lp_algalVerification_Algal_Expr_fuelErr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_fuelErr___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Expr_fuelErr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "left"};
static const lean_object* lp_algalVerification_Algal_Expr_fuelErr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Expr_fuelErr___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fuelErr(lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_evalFuelled___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 12, .m_capacity = 12, .m_length = 11, .m_data = "value-depth"};
static const lean_object* lp_algalVerification_Algal_Expr_evalFuelled___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_evalFuelled___closed__0_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_evalFuelled___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_evalFuelled___closed__1;
static const lean_string_object lp_algalVerification_Algal_Expr_evalFuelled___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 13, .m_capacity = 13, .m_length = 12, .m_data = "output-bytes"};
static const lean_object* lp_algalVerification_Algal_Expr_evalFuelled___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Expr_evalFuelled___closed__2_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_evalFuelled___closed__3_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_evalFuelled___closed__3;
static const lean_string_object lp_algalVerification_Algal_Expr_evalFuelled___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 47, .m_capacity = 47, .m_length = 46, .m_data = "fuel budget must be an integer in [0, 1000000]"};
static const lean_object* lp_algalVerification_Algal_Expr_evalFuelled___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Expr_evalFuelled___closed__4_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_evalFuelled___closed__5_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_evalFuelled___closed__5;
static lean_once_cell_t lp_algalVerification_Algal_Expr_evalFuelled___closed__6_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_evalFuelled___closed__6;
static lean_once_cell_t lp_algalVerification_Algal_Expr_evalFuelled___closed__7_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_evalFuelled___closed__7;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_evalFuelled(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_evalFuelled___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_checkEnvValues(lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_run___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 14, .m_capacity = 14, .m_length = 13, .m_data = "program-depth"};
static const lean_object* lp_algalVerification_Algal_Expr_run___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_run___closed__0_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_run___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_run___closed__1;
static lean_once_cell_t lp_algalVerification_Algal_Expr_run___closed__2_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_run___closed__2;
static lean_once_cell_t lp_algalVerification_Algal_Expr_run___closed__3_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_run___closed__3;
static const lean_string_object lp_algalVerification_Algal_Expr_run___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 14, .m_capacity = 14, .m_length = 13, .m_data = "program-nodes"};
static const lean_object* lp_algalVerification_Algal_Expr_run___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Expr_run___closed__4_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_run___closed__5_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_run___closed__5;
static lean_once_cell_t lp_algalVerification_Algal_Expr_run___closed__6_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_run___closed__6;
static lean_once_cell_t lp_algalVerification_Algal_Expr_run___closed__7_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_run___closed__7;
static const lean_string_object lp_algalVerification_Algal_Expr_run___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 14, .m_capacity = 14, .m_length = 13, .m_data = "program-bytes"};
static const lean_object* lp_algalVerification_Algal_Expr_run___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Expr_run___closed__8_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_run___closed__9_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_run___closed__9;
static lean_once_cell_t lp_algalVerification_Algal_Expr_run___closed__10_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_run___closed__10;
static lean_once_cell_t lp_algalVerification_Algal_Expr_run___closed__11_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_run___closed__11;
static lean_once_cell_t lp_algalVerification_Algal_Expr_run___closed__12_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_run___closed__12;
static lean_once_cell_t lp_algalVerification_Algal_Expr_run___closed__13_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_run___closed__13;
static const lean_string_object lp_algalVerification_Algal_Expr_run___closed__14_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 10, .m_capacity = 10, .m_length = 9, .m_data = "env-bytes"};
static const lean_object* lp_algalVerification_Algal_Expr_run___closed__14 = (const lean_object*)&lp_algalVerification_Algal_Expr_run___closed__14_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_run___closed__15_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_run___closed__15;
static lean_once_cell_t lp_algalVerification_Algal_Expr_run___closed__16_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_run___closed__16;
static lean_once_cell_t lp_algalVerification_Algal_Expr_run___closed__17_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_run___closed__17;
static lean_once_cell_t lp_algalVerification_Algal_Expr_run___closed__18_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_run___closed__18;
static lean_once_cell_t lp_algalVerification_Algal_Expr_run___closed__19_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_run___closed__19;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_run(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__0(lean_object* v_00_u03b1_1_, lean_object* v_00_u03b2_2_, lean_object* v_f_3_, lean_object* v_o_4_){
_start:
{
lean_object* v_result_5_; 
v_result_5_ = lean_ctor_get(v_o_4_, 0);
lean_inc_ref(v_result_5_);
if (lean_obj_tag(v_result_5_) == 0)
{
lean_object* v_charges_6_; lean_object* v___x_8_; uint8_t v_isShared_9_; uint8_t v_isSharedCheck_21_; 
lean_dec(v_f_3_);
v_charges_6_ = lean_ctor_get(v_o_4_, 1);
v_isSharedCheck_21_ = !lean_is_exclusive(v_o_4_);
if (v_isSharedCheck_21_ == 0)
{
lean_object* v_unused_22_; 
v_unused_22_ = lean_ctor_get(v_o_4_, 0);
lean_dec(v_unused_22_);
v___x_8_ = v_o_4_;
v_isShared_9_ = v_isSharedCheck_21_;
goto v_resetjp_7_;
}
else
{
lean_inc(v_charges_6_);
lean_dec(v_o_4_);
v___x_8_ = lean_box(0);
v_isShared_9_ = v_isSharedCheck_21_;
goto v_resetjp_7_;
}
v_resetjp_7_:
{
lean_object* v_a_10_; lean_object* v___x_12_; uint8_t v_isShared_13_; uint8_t v_isSharedCheck_20_; 
v_a_10_ = lean_ctor_get(v_result_5_, 0);
v_isSharedCheck_20_ = !lean_is_exclusive(v_result_5_);
if (v_isSharedCheck_20_ == 0)
{
v___x_12_ = v_result_5_;
v_isShared_13_ = v_isSharedCheck_20_;
goto v_resetjp_11_;
}
else
{
lean_inc(v_a_10_);
lean_dec(v_result_5_);
v___x_12_ = lean_box(0);
v_isShared_13_ = v_isSharedCheck_20_;
goto v_resetjp_11_;
}
v_resetjp_11_:
{
lean_object* v___x_15_; 
if (v_isShared_13_ == 0)
{
v___x_15_ = v___x_12_;
goto v_reusejp_14_;
}
else
{
lean_object* v_reuseFailAlloc_19_; 
v_reuseFailAlloc_19_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_19_, 0, v_a_10_);
v___x_15_ = v_reuseFailAlloc_19_;
goto v_reusejp_14_;
}
v_reusejp_14_:
{
lean_object* v___x_17_; 
if (v_isShared_9_ == 0)
{
lean_ctor_set(v___x_8_, 0, v___x_15_);
v___x_17_ = v___x_8_;
goto v_reusejp_16_;
}
else
{
lean_object* v_reuseFailAlloc_18_; 
v_reuseFailAlloc_18_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_18_, 0, v___x_15_);
lean_ctor_set(v_reuseFailAlloc_18_, 1, v_charges_6_);
v___x_17_ = v_reuseFailAlloc_18_;
goto v_reusejp_16_;
}
v_reusejp_16_:
{
return v___x_17_;
}
}
}
}
}
else
{
lean_object* v_charges_23_; lean_object* v___x_25_; uint8_t v_isShared_26_; uint8_t v_isSharedCheck_39_; 
v_charges_23_ = lean_ctor_get(v_o_4_, 1);
v_isSharedCheck_39_ = !lean_is_exclusive(v_o_4_);
if (v_isSharedCheck_39_ == 0)
{
lean_object* v_unused_40_; 
v_unused_40_ = lean_ctor_get(v_o_4_, 0);
lean_dec(v_unused_40_);
v___x_25_ = v_o_4_;
v_isShared_26_ = v_isSharedCheck_39_;
goto v_resetjp_24_;
}
else
{
lean_inc(v_charges_23_);
lean_dec(v_o_4_);
v___x_25_ = lean_box(0);
v_isShared_26_ = v_isSharedCheck_39_;
goto v_resetjp_24_;
}
v_resetjp_24_:
{
lean_object* v_a_27_; lean_object* v___x_29_; uint8_t v_isShared_30_; uint8_t v_isSharedCheck_38_; 
v_a_27_ = lean_ctor_get(v_result_5_, 0);
v_isSharedCheck_38_ = !lean_is_exclusive(v_result_5_);
if (v_isSharedCheck_38_ == 0)
{
v___x_29_ = v_result_5_;
v_isShared_30_ = v_isSharedCheck_38_;
goto v_resetjp_28_;
}
else
{
lean_inc(v_a_27_);
lean_dec(v_result_5_);
v___x_29_ = lean_box(0);
v_isShared_30_ = v_isSharedCheck_38_;
goto v_resetjp_28_;
}
v_resetjp_28_:
{
lean_object* v___x_31_; lean_object* v___x_33_; 
v___x_31_ = lean_apply_1(v_f_3_, v_a_27_);
if (v_isShared_30_ == 0)
{
lean_ctor_set(v___x_29_, 0, v___x_31_);
v___x_33_ = v___x_29_;
goto v_reusejp_32_;
}
else
{
lean_object* v_reuseFailAlloc_37_; 
v_reuseFailAlloc_37_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_37_, 0, v___x_31_);
v___x_33_ = v_reuseFailAlloc_37_;
goto v_reusejp_32_;
}
v_reusejp_32_:
{
lean_object* v___x_35_; 
if (v_isShared_26_ == 0)
{
lean_ctor_set(v___x_25_, 0, v___x_33_);
v___x_35_ = v___x_25_;
goto v_reusejp_34_;
}
else
{
lean_object* v_reuseFailAlloc_36_; 
v_reuseFailAlloc_36_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_36_, 0, v___x_33_);
lean_ctor_set(v_reuseFailAlloc_36_, 1, v_charges_23_);
v___x_35_ = v_reuseFailAlloc_36_;
goto v_reusejp_34_;
}
v_reusejp_34_:
{
return v___x_35_;
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__1(lean_object* v___f_41_, lean_object* v_00_u03b1_42_, lean_object* v_00_u03b2_43_, lean_object* v___y_44_, lean_object* v___y_45_){
_start:
{
lean_object* v___x_46_; lean_object* v___x_47_; 
v___x_46_ = lean_alloc_closure((void*)(l_Function_const___boxed), 4, 3);
lean_closure_set(v___x_46_, 0, lean_box(0));
lean_closure_set(v___x_46_, 1, lean_box(0));
lean_closure_set(v___x_46_, 2, v___y_44_);
v___x_47_ = lean_apply_4(v___f_41_, lean_box(0), lean_box(0), v___x_46_, v___y_45_);
return v___x_47_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__2(lean_object* v_00_u03b1_48_, lean_object* v_a_49_){
_start:
{
lean_object* v___x_50_; lean_object* v___x_51_; lean_object* v___x_52_; 
v___x_50_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_50_, 0, v_a_49_);
v___x_51_ = lean_box(0);
v___x_52_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_52_, 0, v___x_50_);
lean_ctor_set(v___x_52_, 1, v___x_51_);
return v___x_52_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__3(lean_object* v_00_u03b1_53_, lean_object* v_00_u03b2_54_, lean_object* v_fs_55_, lean_object* v_xs_56_){
_start:
{
lean_object* v_result_57_; 
v_result_57_ = lean_ctor_get(v_fs_55_, 0);
lean_inc_ref(v_result_57_);
if (lean_obj_tag(v_result_57_) == 0)
{
lean_object* v_charges_58_; lean_object* v___x_60_; uint8_t v_isShared_61_; uint8_t v_isSharedCheck_73_; 
lean_dec_ref(v_xs_56_);
v_charges_58_ = lean_ctor_get(v_fs_55_, 1);
v_isSharedCheck_73_ = !lean_is_exclusive(v_fs_55_);
if (v_isSharedCheck_73_ == 0)
{
lean_object* v_unused_74_; 
v_unused_74_ = lean_ctor_get(v_fs_55_, 0);
lean_dec(v_unused_74_);
v___x_60_ = v_fs_55_;
v_isShared_61_ = v_isSharedCheck_73_;
goto v_resetjp_59_;
}
else
{
lean_inc(v_charges_58_);
lean_dec(v_fs_55_);
v___x_60_ = lean_box(0);
v_isShared_61_ = v_isSharedCheck_73_;
goto v_resetjp_59_;
}
v_resetjp_59_:
{
lean_object* v_a_62_; lean_object* v___x_64_; uint8_t v_isShared_65_; uint8_t v_isSharedCheck_72_; 
v_a_62_ = lean_ctor_get(v_result_57_, 0);
v_isSharedCheck_72_ = !lean_is_exclusive(v_result_57_);
if (v_isSharedCheck_72_ == 0)
{
v___x_64_ = v_result_57_;
v_isShared_65_ = v_isSharedCheck_72_;
goto v_resetjp_63_;
}
else
{
lean_inc(v_a_62_);
lean_dec(v_result_57_);
v___x_64_ = lean_box(0);
v_isShared_65_ = v_isSharedCheck_72_;
goto v_resetjp_63_;
}
v_resetjp_63_:
{
lean_object* v___x_67_; 
if (v_isShared_65_ == 0)
{
v___x_67_ = v___x_64_;
goto v_reusejp_66_;
}
else
{
lean_object* v_reuseFailAlloc_71_; 
v_reuseFailAlloc_71_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_71_, 0, v_a_62_);
v___x_67_ = v_reuseFailAlloc_71_;
goto v_reusejp_66_;
}
v_reusejp_66_:
{
lean_object* v___x_69_; 
if (v_isShared_61_ == 0)
{
lean_ctor_set(v___x_60_, 0, v___x_67_);
v___x_69_ = v___x_60_;
goto v_reusejp_68_;
}
else
{
lean_object* v_reuseFailAlloc_70_; 
v_reuseFailAlloc_70_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_70_, 0, v___x_67_);
lean_ctor_set(v_reuseFailAlloc_70_, 1, v_charges_58_);
v___x_69_ = v_reuseFailAlloc_70_;
goto v_reusejp_68_;
}
v_reusejp_68_:
{
return v___x_69_;
}
}
}
}
}
else
{
lean_object* v_charges_75_; lean_object* v_a_76_; lean_object* v___x_77_; lean_object* v_r_78_; lean_object* v_result_79_; 
v_charges_75_ = lean_ctor_get(v_fs_55_, 1);
lean_inc(v_charges_75_);
lean_dec_ref(v_fs_55_);
v_a_76_ = lean_ctor_get(v_result_57_, 0);
lean_inc(v_a_76_);
lean_dec_ref_known(v_result_57_, 1);
v___x_77_ = lean_box(0);
v_r_78_ = lean_apply_1(v_xs_56_, v___x_77_);
v_result_79_ = lean_ctor_get(v_r_78_, 0);
lean_inc_ref(v_result_79_);
if (lean_obj_tag(v_result_79_) == 0)
{
lean_object* v_charges_80_; lean_object* v___x_82_; uint8_t v_isShared_83_; uint8_t v_isSharedCheck_96_; 
lean_dec(v_a_76_);
v_charges_80_ = lean_ctor_get(v_r_78_, 1);
v_isSharedCheck_96_ = !lean_is_exclusive(v_r_78_);
if (v_isSharedCheck_96_ == 0)
{
lean_object* v_unused_97_; 
v_unused_97_ = lean_ctor_get(v_r_78_, 0);
lean_dec(v_unused_97_);
v___x_82_ = v_r_78_;
v_isShared_83_ = v_isSharedCheck_96_;
goto v_resetjp_81_;
}
else
{
lean_inc(v_charges_80_);
lean_dec(v_r_78_);
v___x_82_ = lean_box(0);
v_isShared_83_ = v_isSharedCheck_96_;
goto v_resetjp_81_;
}
v_resetjp_81_:
{
lean_object* v_a_84_; lean_object* v___x_86_; uint8_t v_isShared_87_; uint8_t v_isSharedCheck_95_; 
v_a_84_ = lean_ctor_get(v_result_79_, 0);
v_isSharedCheck_95_ = !lean_is_exclusive(v_result_79_);
if (v_isSharedCheck_95_ == 0)
{
v___x_86_ = v_result_79_;
v_isShared_87_ = v_isSharedCheck_95_;
goto v_resetjp_85_;
}
else
{
lean_inc(v_a_84_);
lean_dec(v_result_79_);
v___x_86_ = lean_box(0);
v_isShared_87_ = v_isSharedCheck_95_;
goto v_resetjp_85_;
}
v_resetjp_85_:
{
lean_object* v___x_89_; 
if (v_isShared_87_ == 0)
{
v___x_89_ = v___x_86_;
goto v_reusejp_88_;
}
else
{
lean_object* v_reuseFailAlloc_94_; 
v_reuseFailAlloc_94_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_94_, 0, v_a_84_);
v___x_89_ = v_reuseFailAlloc_94_;
goto v_reusejp_88_;
}
v_reusejp_88_:
{
lean_object* v___x_90_; lean_object* v___x_92_; 
v___x_90_ = l_List_appendTR___redArg(v_charges_75_, v_charges_80_);
if (v_isShared_83_ == 0)
{
lean_ctor_set(v___x_82_, 1, v___x_90_);
lean_ctor_set(v___x_82_, 0, v___x_89_);
v___x_92_ = v___x_82_;
goto v_reusejp_91_;
}
else
{
lean_object* v_reuseFailAlloc_93_; 
v_reuseFailAlloc_93_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_93_, 0, v___x_89_);
lean_ctor_set(v_reuseFailAlloc_93_, 1, v___x_90_);
v___x_92_ = v_reuseFailAlloc_93_;
goto v_reusejp_91_;
}
v_reusejp_91_:
{
return v___x_92_;
}
}
}
}
}
else
{
lean_object* v_charges_98_; lean_object* v___x_100_; uint8_t v_isShared_101_; uint8_t v_isSharedCheck_115_; 
v_charges_98_ = lean_ctor_get(v_r_78_, 1);
v_isSharedCheck_115_ = !lean_is_exclusive(v_r_78_);
if (v_isSharedCheck_115_ == 0)
{
lean_object* v_unused_116_; 
v_unused_116_ = lean_ctor_get(v_r_78_, 0);
lean_dec(v_unused_116_);
v___x_100_ = v_r_78_;
v_isShared_101_ = v_isSharedCheck_115_;
goto v_resetjp_99_;
}
else
{
lean_inc(v_charges_98_);
lean_dec(v_r_78_);
v___x_100_ = lean_box(0);
v_isShared_101_ = v_isSharedCheck_115_;
goto v_resetjp_99_;
}
v_resetjp_99_:
{
lean_object* v_a_102_; lean_object* v___x_104_; uint8_t v_isShared_105_; uint8_t v_isSharedCheck_114_; 
v_a_102_ = lean_ctor_get(v_result_79_, 0);
v_isSharedCheck_114_ = !lean_is_exclusive(v_result_79_);
if (v_isSharedCheck_114_ == 0)
{
v___x_104_ = v_result_79_;
v_isShared_105_ = v_isSharedCheck_114_;
goto v_resetjp_103_;
}
else
{
lean_inc(v_a_102_);
lean_dec(v_result_79_);
v___x_104_ = lean_box(0);
v_isShared_105_ = v_isSharedCheck_114_;
goto v_resetjp_103_;
}
v_resetjp_103_:
{
lean_object* v___x_106_; lean_object* v___x_108_; 
v___x_106_ = lean_apply_1(v_a_76_, v_a_102_);
if (v_isShared_105_ == 0)
{
lean_ctor_set(v___x_104_, 0, v___x_106_);
v___x_108_ = v___x_104_;
goto v_reusejp_107_;
}
else
{
lean_object* v_reuseFailAlloc_113_; 
v_reuseFailAlloc_113_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_113_, 0, v___x_106_);
v___x_108_ = v_reuseFailAlloc_113_;
goto v_reusejp_107_;
}
v_reusejp_107_:
{
lean_object* v___x_109_; lean_object* v___x_111_; 
v___x_109_ = l_List_appendTR___redArg(v_charges_75_, v_charges_98_);
if (v_isShared_101_ == 0)
{
lean_ctor_set(v___x_100_, 1, v___x_109_);
lean_ctor_set(v___x_100_, 0, v___x_108_);
v___x_111_ = v___x_100_;
goto v_reusejp_110_;
}
else
{
lean_object* v_reuseFailAlloc_112_; 
v_reuseFailAlloc_112_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_112_, 0, v___x_108_);
lean_ctor_set(v_reuseFailAlloc_112_, 1, v___x_109_);
v___x_111_ = v_reuseFailAlloc_112_;
goto v_reusejp_110_;
}
v_reusejp_110_:
{
return v___x_111_;
}
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__4(lean_object* v_00_u03b1_117_, lean_object* v_00_u03b2_118_, lean_object* v_o_119_, lean_object* v_f_120_){
_start:
{
lean_object* v_result_121_; 
v_result_121_ = lean_ctor_get(v_o_119_, 0);
lean_inc_ref(v_result_121_);
if (lean_obj_tag(v_result_121_) == 0)
{
lean_object* v_charges_122_; lean_object* v___x_124_; uint8_t v_isShared_125_; uint8_t v_isSharedCheck_137_; 
lean_dec_ref(v_f_120_);
v_charges_122_ = lean_ctor_get(v_o_119_, 1);
v_isSharedCheck_137_ = !lean_is_exclusive(v_o_119_);
if (v_isSharedCheck_137_ == 0)
{
lean_object* v_unused_138_; 
v_unused_138_ = lean_ctor_get(v_o_119_, 0);
lean_dec(v_unused_138_);
v___x_124_ = v_o_119_;
v_isShared_125_ = v_isSharedCheck_137_;
goto v_resetjp_123_;
}
else
{
lean_inc(v_charges_122_);
lean_dec(v_o_119_);
v___x_124_ = lean_box(0);
v_isShared_125_ = v_isSharedCheck_137_;
goto v_resetjp_123_;
}
v_resetjp_123_:
{
lean_object* v_a_126_; lean_object* v___x_128_; uint8_t v_isShared_129_; uint8_t v_isSharedCheck_136_; 
v_a_126_ = lean_ctor_get(v_result_121_, 0);
v_isSharedCheck_136_ = !lean_is_exclusive(v_result_121_);
if (v_isSharedCheck_136_ == 0)
{
v___x_128_ = v_result_121_;
v_isShared_129_ = v_isSharedCheck_136_;
goto v_resetjp_127_;
}
else
{
lean_inc(v_a_126_);
lean_dec(v_result_121_);
v___x_128_ = lean_box(0);
v_isShared_129_ = v_isSharedCheck_136_;
goto v_resetjp_127_;
}
v_resetjp_127_:
{
lean_object* v___x_131_; 
if (v_isShared_129_ == 0)
{
v___x_131_ = v___x_128_;
goto v_reusejp_130_;
}
else
{
lean_object* v_reuseFailAlloc_135_; 
v_reuseFailAlloc_135_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_135_, 0, v_a_126_);
v___x_131_ = v_reuseFailAlloc_135_;
goto v_reusejp_130_;
}
v_reusejp_130_:
{
lean_object* v___x_133_; 
if (v_isShared_125_ == 0)
{
lean_ctor_set(v___x_124_, 0, v___x_131_);
v___x_133_ = v___x_124_;
goto v_reusejp_132_;
}
else
{
lean_object* v_reuseFailAlloc_134_; 
v_reuseFailAlloc_134_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_134_, 0, v___x_131_);
lean_ctor_set(v_reuseFailAlloc_134_, 1, v_charges_122_);
v___x_133_ = v_reuseFailAlloc_134_;
goto v_reusejp_132_;
}
v_reusejp_132_:
{
return v___x_133_;
}
}
}
}
}
else
{
lean_object* v_charges_139_; lean_object* v_a_140_; lean_object* v_r_141_; lean_object* v_result_142_; lean_object* v_charges_143_; lean_object* v___x_145_; uint8_t v_isShared_146_; uint8_t v_isSharedCheck_151_; 
v_charges_139_ = lean_ctor_get(v_o_119_, 1);
lean_inc(v_charges_139_);
lean_dec_ref(v_o_119_);
v_a_140_ = lean_ctor_get(v_result_121_, 0);
lean_inc(v_a_140_);
lean_dec_ref_known(v_result_121_, 1);
v_r_141_ = lean_apply_1(v_f_120_, v_a_140_);
v_result_142_ = lean_ctor_get(v_r_141_, 0);
v_charges_143_ = lean_ctor_get(v_r_141_, 1);
v_isSharedCheck_151_ = !lean_is_exclusive(v_r_141_);
if (v_isSharedCheck_151_ == 0)
{
v___x_145_ = v_r_141_;
v_isShared_146_ = v_isSharedCheck_151_;
goto v_resetjp_144_;
}
else
{
lean_inc(v_charges_143_);
lean_inc(v_result_142_);
lean_dec(v_r_141_);
v___x_145_ = lean_box(0);
v_isShared_146_ = v_isSharedCheck_151_;
goto v_resetjp_144_;
}
v_resetjp_144_:
{
lean_object* v___x_147_; lean_object* v___x_149_; 
v___x_147_ = l_List_appendTR___redArg(v_charges_139_, v_charges_143_);
if (v_isShared_146_ == 0)
{
lean_ctor_set(v___x_145_, 1, v___x_147_);
v___x_149_ = v___x_145_;
goto v_reusejp_148_;
}
else
{
lean_object* v_reuseFailAlloc_150_; 
v_reuseFailAlloc_150_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_150_, 0, v_result_142_);
lean_ctor_set(v_reuseFailAlloc_150_, 1, v___x_147_);
v___x_149_ = v_reuseFailAlloc_150_;
goto v_reusejp_148_;
}
v_reusejp_148_:
{
return v___x_149_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__5(lean_object* v___f_152_, lean_object* v_a_153_, lean_object* v_x_154_){
_start:
{
lean_object* v___x_155_; 
v___x_155_ = lean_apply_2(v___f_152_, lean_box(0), v_a_153_);
return v___x_155_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__5___boxed(lean_object* v___f_156_, lean_object* v_a_157_, lean_object* v_x_158_){
_start:
{
lean_object* v_res_159_; 
v_res_159_ = lp_algalVerification_Algal_Expr_instMonadR___lam__5(v___f_156_, v_a_157_, v_x_158_);
lean_dec(v_x_158_);
return v_res_159_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__6(lean_object* v___f_160_, lean_object* v_y_161_, lean_object* v___f_162_, lean_object* v_a_163_){
_start:
{
lean_object* v___f_164_; lean_object* v___x_165_; lean_object* v___x_166_; lean_object* v___x_167_; 
v___f_164_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Expr_instMonadR___lam__5___boxed), 3, 2);
lean_closure_set(v___f_164_, 0, v___f_160_);
lean_closure_set(v___f_164_, 1, v_a_163_);
v___x_165_ = lean_box(0);
v___x_166_ = lean_apply_1(v_y_161_, v___x_165_);
v___x_167_ = lean_apply_4(v___f_162_, lean_box(0), lean_box(0), v___x_166_, v___f_164_);
return v___x_167_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__7(lean_object* v___f_168_, lean_object* v___f_169_, lean_object* v_00_u03b1_170_, lean_object* v_00_u03b2_171_, lean_object* v_x_172_, lean_object* v_y_173_){
_start:
{
lean_object* v___f_174_; lean_object* v___x_175_; 
lean_inc_ref(v___f_169_);
v___f_174_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Expr_instMonadR___lam__6), 4, 3);
lean_closure_set(v___f_174_, 0, v___f_168_);
lean_closure_set(v___f_174_, 1, v_y_173_);
lean_closure_set(v___f_174_, 2, v___f_169_);
v___x_175_ = lean_apply_4(v___f_169_, lean_box(0), lean_box(0), v_x_172_, v___f_174_);
return v___x_175_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instMonadR___lam__8(lean_object* v_00_u03b1_176_, lean_object* v_00_u03b2_177_, lean_object* v_x_178_, lean_object* v_y_179_){
_start:
{
lean_object* v_result_180_; 
v_result_180_ = lean_ctor_get(v_x_178_, 0);
lean_inc_ref(v_result_180_);
if (lean_obj_tag(v_result_180_) == 0)
{
lean_object* v_charges_181_; lean_object* v___x_183_; uint8_t v_isShared_184_; uint8_t v_isSharedCheck_196_; 
lean_dec_ref(v_y_179_);
v_charges_181_ = lean_ctor_get(v_x_178_, 1);
v_isSharedCheck_196_ = !lean_is_exclusive(v_x_178_);
if (v_isSharedCheck_196_ == 0)
{
lean_object* v_unused_197_; 
v_unused_197_ = lean_ctor_get(v_x_178_, 0);
lean_dec(v_unused_197_);
v___x_183_ = v_x_178_;
v_isShared_184_ = v_isSharedCheck_196_;
goto v_resetjp_182_;
}
else
{
lean_inc(v_charges_181_);
lean_dec(v_x_178_);
v___x_183_ = lean_box(0);
v_isShared_184_ = v_isSharedCheck_196_;
goto v_resetjp_182_;
}
v_resetjp_182_:
{
lean_object* v_a_185_; lean_object* v___x_187_; uint8_t v_isShared_188_; uint8_t v_isSharedCheck_195_; 
v_a_185_ = lean_ctor_get(v_result_180_, 0);
v_isSharedCheck_195_ = !lean_is_exclusive(v_result_180_);
if (v_isSharedCheck_195_ == 0)
{
v___x_187_ = v_result_180_;
v_isShared_188_ = v_isSharedCheck_195_;
goto v_resetjp_186_;
}
else
{
lean_inc(v_a_185_);
lean_dec(v_result_180_);
v___x_187_ = lean_box(0);
v_isShared_188_ = v_isSharedCheck_195_;
goto v_resetjp_186_;
}
v_resetjp_186_:
{
lean_object* v___x_190_; 
if (v_isShared_188_ == 0)
{
v___x_190_ = v___x_187_;
goto v_reusejp_189_;
}
else
{
lean_object* v_reuseFailAlloc_194_; 
v_reuseFailAlloc_194_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_194_, 0, v_a_185_);
v___x_190_ = v_reuseFailAlloc_194_;
goto v_reusejp_189_;
}
v_reusejp_189_:
{
lean_object* v___x_192_; 
if (v_isShared_184_ == 0)
{
lean_ctor_set(v___x_183_, 0, v___x_190_);
v___x_192_ = v___x_183_;
goto v_reusejp_191_;
}
else
{
lean_object* v_reuseFailAlloc_193_; 
v_reuseFailAlloc_193_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_193_, 0, v___x_190_);
lean_ctor_set(v_reuseFailAlloc_193_, 1, v_charges_181_);
v___x_192_ = v_reuseFailAlloc_193_;
goto v_reusejp_191_;
}
v_reusejp_191_:
{
return v___x_192_;
}
}
}
}
}
else
{
lean_object* v_charges_198_; lean_object* v___x_199_; lean_object* v_r_200_; lean_object* v_result_201_; lean_object* v_charges_202_; lean_object* v___x_204_; uint8_t v_isShared_205_; uint8_t v_isSharedCheck_210_; 
lean_dec_ref_known(v_result_180_, 1);
v_charges_198_ = lean_ctor_get(v_x_178_, 1);
lean_inc(v_charges_198_);
lean_dec_ref(v_x_178_);
v___x_199_ = lean_box(0);
v_r_200_ = lean_apply_1(v_y_179_, v___x_199_);
v_result_201_ = lean_ctor_get(v_r_200_, 0);
v_charges_202_ = lean_ctor_get(v_r_200_, 1);
v_isSharedCheck_210_ = !lean_is_exclusive(v_r_200_);
if (v_isSharedCheck_210_ == 0)
{
v___x_204_ = v_r_200_;
v_isShared_205_ = v_isSharedCheck_210_;
goto v_resetjp_203_;
}
else
{
lean_inc(v_charges_202_);
lean_inc(v_result_201_);
lean_dec(v_r_200_);
v___x_204_ = lean_box(0);
v_isShared_205_ = v_isSharedCheck_210_;
goto v_resetjp_203_;
}
v_resetjp_203_:
{
lean_object* v___x_206_; lean_object* v___x_208_; 
v___x_206_ = l_List_appendTR___redArg(v_charges_198_, v_charges_202_);
if (v_isShared_205_ == 0)
{
lean_ctor_set(v___x_204_, 1, v___x_206_);
v___x_208_ = v___x_204_;
goto v_reusejp_207_;
}
else
{
lean_object* v_reuseFailAlloc_209_; 
v_reuseFailAlloc_209_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_209_, 0, v_result_201_);
lean_ctor_set(v_reuseFailAlloc_209_, 1, v___x_206_);
v___x_208_ = v_reuseFailAlloc_209_;
goto v_reusejp_207_;
}
v_reusejp_207_:
{
return v___x_208_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_charge(lean_object* v_c_236_){
_start:
{
lean_object* v___x_237_; lean_object* v___x_238_; lean_object* v___x_239_; lean_object* v___x_240_; 
v___x_237_ = ((lean_object*)(lp_algalVerification_Algal_Expr_charge___closed__0));
v___x_238_ = lean_box(0);
v___x_239_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_239_, 0, v_c_236_);
lean_ctor_set(v___x_239_, 1, v___x_238_);
v___x_240_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_240_, 0, v___x_237_);
lean_ctor_set(v___x_240_, 1, v___x_239_);
return v___x_240_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fail___redArg(lean_object* v_e_241_){
_start:
{
lean_object* v___x_242_; lean_object* v___x_243_; lean_object* v___x_244_; 
v___x_242_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_242_, 0, v_e_241_);
v___x_243_ = lean_box(0);
v___x_244_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_244_, 0, v___x_242_);
lean_ctor_set(v___x_244_, 1, v___x_243_);
return v___x_244_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fail(lean_object* v_00_u03b1_245_, lean_object* v_e_246_){
_start:
{
lean_object* v___x_247_; 
v___x_247_ = lp_algalVerification_Algal_Expr_fail___redArg(v_e_246_);
return v___x_247_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_failWith___redArg(lean_object* v_e_248_, lean_object* v_cs_249_){
_start:
{
lean_object* v___x_250_; lean_object* v___x_251_; 
v___x_250_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_250_, 0, v_e_248_);
v___x_251_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_251_, 0, v___x_250_);
lean_ctor_set(v___x_251_, 1, v_cs_249_);
return v___x_251_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_failWith(lean_object* v_00_u03b1_252_, lean_object* v_e_253_, lean_object* v_cs_254_){
_start:
{
lean_object* v___x_255_; 
v___x_255_ = lp_algalVerification_Algal_Expr_failWith___redArg(v_e_253_, v_cs_254_);
return v___x_255_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_charged___redArg(lean_object* v_v_256_, lean_object* v_cs_257_){
_start:
{
lean_object* v___x_258_; lean_object* v___x_259_; 
v___x_258_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_258_, 0, v_v_256_);
v___x_259_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_259_, 0, v___x_258_);
lean_ctor_set(v___x_259_, 1, v_cs_257_);
return v___x_259_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_charged(lean_object* v_00_u03b1_260_, lean_object* v_v_261_, lean_object* v_cs_262_){
_start:
{
lean_object* v___x_263_; 
v___x_263_ = lp_algalVerification_Algal_Expr_charged___redArg(v_v_261_, v_cs_262_);
return v___x_263_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_liftE___redArg(lean_object* v_e_264_){
_start:
{
lean_object* v___x_265_; lean_object* v___x_266_; 
v___x_265_ = lean_box(0);
v___x_266_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_266_, 0, v_e_264_);
lean_ctor_set(v___x_266_, 1, v___x_265_);
return v___x_266_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_liftE(lean_object* v_00_u03b1_267_, lean_object* v_e_268_){
_start:
{
lean_object* v___x_269_; 
v___x_269_ = lp_algalVerification_Algal_Expr_liftE___redArg(v_e_268_);
return v___x_269_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_postCheck(lean_object* v_o_270_){
_start:
{
lean_object* v_result_271_; lean_object* v_charges_272_; lean_object* v___x_274_; uint8_t v_isShared_275_; uint8_t v_isSharedCheck_291_; 
v_result_271_ = lean_ctor_get(v_o_270_, 0);
v_charges_272_ = lean_ctor_get(v_o_270_, 1);
v_isSharedCheck_291_ = !lean_is_exclusive(v_o_270_);
if (v_isSharedCheck_291_ == 0)
{
v___x_274_ = v_o_270_;
v_isShared_275_ = v_isSharedCheck_291_;
goto v_resetjp_273_;
}
else
{
lean_inc(v_charges_272_);
lean_inc(v_result_271_);
lean_dec(v_o_270_);
v___x_274_ = lean_box(0);
v_isShared_275_ = v_isSharedCheck_291_;
goto v_resetjp_273_;
}
v_resetjp_273_:
{
lean_object* v_result_277_; lean_object* v_charges_278_; 
if (lean_obj_tag(v_result_271_) == 0)
{
lean_object* v___x_283_; 
lean_del_object(v___x_274_);
v___x_283_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_283_, 0, v_result_271_);
lean_ctor_set(v___x_283_, 1, v_charges_272_);
return v___x_283_;
}
else
{
lean_object* v_a_284_; lean_object* v___x_285_; 
v_a_284_ = lean_ctor_get(v_result_271_, 0);
lean_inc(v_a_284_);
v___x_285_ = lp_algalVerification_Algal_Expr_checkValue(v_a_284_);
if (lean_obj_tag(v___x_285_) == 0)
{
lean_object* v_a_286_; lean_object* v___x_287_; lean_object* v_result_288_; lean_object* v___x_289_; 
lean_dec_ref_known(v_result_271_, 1);
v_a_286_ = lean_ctor_get(v___x_285_, 0);
lean_inc(v_a_286_);
lean_dec_ref_known(v___x_285_, 1);
v___x_287_ = lp_algalVerification_Algal_Expr_fail___redArg(v_a_286_);
v_result_288_ = lean_ctor_get(v___x_287_, 0);
lean_inc_ref(v_result_288_);
lean_dec_ref(v___x_287_);
v___x_289_ = lean_box(0);
v_result_277_ = v_result_288_;
v_charges_278_ = v___x_289_;
goto v___jp_276_;
}
else
{
lean_object* v___x_290_; 
lean_dec_ref_known(v___x_285_, 1);
v___x_290_ = lean_box(0);
v_result_277_ = v_result_271_;
v_charges_278_ = v___x_290_;
goto v___jp_276_;
}
}
v___jp_276_:
{
lean_object* v___x_279_; lean_object* v___x_281_; 
lean_inc(v_charges_278_);
v___x_279_ = l_List_appendTR___redArg(v_charges_272_, v_charges_278_);
if (v_isShared_275_ == 0)
{
lean_ctor_set(v___x_274_, 1, v___x_279_);
lean_ctor_set(v___x_274_, 0, v_result_277_);
v___x_281_ = v___x_274_;
goto v_reusejp_280_;
}
else
{
lean_object* v_reuseFailAlloc_282_; 
v_reuseFailAlloc_282_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_282_, 0, v_result_277_);
lean_ctor_set(v_reuseFailAlloc_282_, 1, v___x_279_);
v___x_281_ = v_reuseFailAlloc_282_;
goto v_reusejp_280_;
}
v_reusejp_280_:
{
return v___x_281_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asNum(lean_object* v_op_293_, lean_object* v_arg_294_, lean_object* v_x_295_){
_start:
{
if (lean_obj_tag(v_x_295_) == 2)
{
uint64_t v_value_296_; double v___x_297_; lean_object* v___x_298_; lean_object* v___x_299_; lean_object* v___x_300_; lean_object* v___x_301_; 
lean_dec(v_arg_294_);
lean_dec_ref(v_op_293_);
v_value_296_ = lean_ctor_get_uint64(v_x_295_, 0);
v___x_297_ = lean_float_of_bits(v_value_296_);
v___x_298_ = lean_box_float(v___x_297_);
v___x_299_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_299_, 0, v___x_298_);
v___x_300_ = lean_box(0);
v___x_301_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_301_, 0, v___x_299_);
lean_ctor_set(v___x_301_, 1, v___x_300_);
return v___x_301_;
}
else
{
lean_object* v___x_302_; lean_object* v___x_303_; lean_object* v___x_304_; lean_object* v___x_305_; 
v___x_302_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asNum___closed__0));
v___x_303_ = lp_algalVerification_Algal_Expr_kindOf(v_x_295_);
v___x_304_ = lp_algalVerification_Algal_Expr_errType(v_op_293_, v_arg_294_, v___x_302_, v___x_303_);
v___x_305_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_304_);
return v___x_305_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asNum___boxed(lean_object* v_op_306_, lean_object* v_arg_307_, lean_object* v_x_308_){
_start:
{
lean_object* v_res_309_; 
v_res_309_ = lp_algalVerification_Algal_Expr_asNum(v_op_306_, v_arg_307_, v_x_308_);
lean_dec(v_x_308_);
return v_res_309_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asBool(lean_object* v_op_311_, lean_object* v_arg_312_, lean_object* v_x_313_){
_start:
{
if (lean_obj_tag(v_x_313_) == 1)
{
uint8_t v_value_314_; lean_object* v___x_315_; lean_object* v___x_316_; lean_object* v___x_317_; lean_object* v___x_318_; 
lean_dec(v_arg_312_);
lean_dec_ref(v_op_311_);
v_value_314_ = lean_ctor_get_uint8(v_x_313_, 0);
v___x_315_ = lean_box(v_value_314_);
v___x_316_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_316_, 0, v___x_315_);
v___x_317_ = lean_box(0);
v___x_318_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_318_, 0, v___x_316_);
lean_ctor_set(v___x_318_, 1, v___x_317_);
return v___x_318_;
}
else
{
lean_object* v___x_319_; lean_object* v___x_320_; lean_object* v___x_321_; lean_object* v___x_322_; 
v___x_319_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asBool___closed__0));
v___x_320_ = lp_algalVerification_Algal_Expr_kindOf(v_x_313_);
v___x_321_ = lp_algalVerification_Algal_Expr_errType(v_op_311_, v_arg_312_, v___x_319_, v___x_320_);
v___x_322_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_321_);
return v___x_322_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asBool___boxed(lean_object* v_op_323_, lean_object* v_arg_324_, lean_object* v_x_325_){
_start:
{
lean_object* v_res_326_; 
v_res_326_ = lp_algalVerification_Algal_Expr_asBool(v_op_323_, v_arg_324_, v_x_325_);
lean_dec(v_x_325_);
return v_res_326_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asList(lean_object* v_op_328_, lean_object* v_arg_329_, lean_object* v_x_330_){
_start:
{
if (lean_obj_tag(v_x_330_) == 4)
{
lean_object* v_values_331_; lean_object* v___x_333_; uint8_t v_isShared_334_; uint8_t v_isSharedCheck_340_; 
lean_dec(v_arg_329_);
lean_dec_ref(v_op_328_);
v_values_331_ = lean_ctor_get(v_x_330_, 0);
v_isSharedCheck_340_ = !lean_is_exclusive(v_x_330_);
if (v_isSharedCheck_340_ == 0)
{
v___x_333_ = v_x_330_;
v_isShared_334_ = v_isSharedCheck_340_;
goto v_resetjp_332_;
}
else
{
lean_inc(v_values_331_);
lean_dec(v_x_330_);
v___x_333_ = lean_box(0);
v_isShared_334_ = v_isSharedCheck_340_;
goto v_resetjp_332_;
}
v_resetjp_332_:
{
lean_object* v___x_336_; 
if (v_isShared_334_ == 0)
{
lean_ctor_set_tag(v___x_333_, 1);
v___x_336_ = v___x_333_;
goto v_reusejp_335_;
}
else
{
lean_object* v_reuseFailAlloc_339_; 
v_reuseFailAlloc_339_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_339_, 0, v_values_331_);
v___x_336_ = v_reuseFailAlloc_339_;
goto v_reusejp_335_;
}
v_reusejp_335_:
{
lean_object* v___x_337_; lean_object* v___x_338_; 
v___x_337_ = lean_box(0);
v___x_338_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_338_, 0, v___x_336_);
lean_ctor_set(v___x_338_, 1, v___x_337_);
return v___x_338_;
}
}
}
else
{
lean_object* v___x_341_; lean_object* v___x_342_; lean_object* v___x_343_; lean_object* v___x_344_; 
v___x_341_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asList___closed__0));
v___x_342_ = lp_algalVerification_Algal_Expr_kindOf(v_x_330_);
lean_dec(v_x_330_);
v___x_343_ = lp_algalVerification_Algal_Expr_errType(v_op_328_, v_arg_329_, v___x_341_, v___x_342_);
v___x_344_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_343_);
return v___x_344_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asMap(lean_object* v_op_346_, lean_object* v_arg_347_, lean_object* v_x_348_){
_start:
{
if (lean_obj_tag(v_x_348_) == 5)
{
lean_object* v_fields_349_; lean_object* v___x_351_; uint8_t v_isShared_352_; uint8_t v_isSharedCheck_358_; 
lean_dec(v_arg_347_);
lean_dec_ref(v_op_346_);
v_fields_349_ = lean_ctor_get(v_x_348_, 0);
v_isSharedCheck_358_ = !lean_is_exclusive(v_x_348_);
if (v_isSharedCheck_358_ == 0)
{
v___x_351_ = v_x_348_;
v_isShared_352_ = v_isSharedCheck_358_;
goto v_resetjp_350_;
}
else
{
lean_inc(v_fields_349_);
lean_dec(v_x_348_);
v___x_351_ = lean_box(0);
v_isShared_352_ = v_isSharedCheck_358_;
goto v_resetjp_350_;
}
v_resetjp_350_:
{
lean_object* v___x_354_; 
if (v_isShared_352_ == 0)
{
lean_ctor_set_tag(v___x_351_, 1);
v___x_354_ = v___x_351_;
goto v_reusejp_353_;
}
else
{
lean_object* v_reuseFailAlloc_357_; 
v_reuseFailAlloc_357_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_357_, 0, v_fields_349_);
v___x_354_ = v_reuseFailAlloc_357_;
goto v_reusejp_353_;
}
v_reusejp_353_:
{
lean_object* v___x_355_; lean_object* v___x_356_; 
v___x_355_ = lean_box(0);
v___x_356_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_356_, 0, v___x_354_);
lean_ctor_set(v___x_356_, 1, v___x_355_);
return v___x_356_;
}
}
}
else
{
lean_object* v___x_359_; lean_object* v___x_360_; lean_object* v___x_361_; lean_object* v___x_362_; 
v___x_359_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asMap___closed__0));
v___x_360_ = lp_algalVerification_Algal_Expr_kindOf(v_x_348_);
lean_dec(v_x_348_);
v___x_361_ = lp_algalVerification_Algal_Expr_errType(v_op_346_, v_arg_347_, v___x_359_, v___x_360_);
v___x_362_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_361_);
return v___x_362_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asStr(lean_object* v_op_364_, lean_object* v_arg_365_, lean_object* v_x_366_){
_start:
{
if (lean_obj_tag(v_x_366_) == 3)
{
lean_object* v_value_367_; lean_object* v___x_369_; uint8_t v_isShared_370_; uint8_t v_isSharedCheck_376_; 
lean_dec(v_arg_365_);
lean_dec_ref(v_op_364_);
v_value_367_ = lean_ctor_get(v_x_366_, 0);
v_isSharedCheck_376_ = !lean_is_exclusive(v_x_366_);
if (v_isSharedCheck_376_ == 0)
{
v___x_369_ = v_x_366_;
v_isShared_370_ = v_isSharedCheck_376_;
goto v_resetjp_368_;
}
else
{
lean_inc(v_value_367_);
lean_dec(v_x_366_);
v___x_369_ = lean_box(0);
v_isShared_370_ = v_isSharedCheck_376_;
goto v_resetjp_368_;
}
v_resetjp_368_:
{
lean_object* v___x_372_; 
if (v_isShared_370_ == 0)
{
lean_ctor_set_tag(v___x_369_, 1);
v___x_372_ = v___x_369_;
goto v_reusejp_371_;
}
else
{
lean_object* v_reuseFailAlloc_375_; 
v_reuseFailAlloc_375_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_375_, 0, v_value_367_);
v___x_372_ = v_reuseFailAlloc_375_;
goto v_reusejp_371_;
}
v_reusejp_371_:
{
lean_object* v___x_373_; lean_object* v___x_374_; 
v___x_373_ = lean_box(0);
v___x_374_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_374_, 0, v___x_372_);
lean_ctor_set(v___x_374_, 1, v___x_373_);
return v___x_374_;
}
}
}
else
{
lean_object* v___x_377_; lean_object* v___x_378_; lean_object* v___x_379_; lean_object* v___x_380_; 
v___x_377_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asStr___closed__0));
v___x_378_ = lp_algalVerification_Algal_Expr_kindOf(v_x_366_);
lean_dec(v_x_366_);
v___x_379_ = lp_algalVerification_Algal_Expr_errType(v_op_364_, v_arg_365_, v___x_377_, v___x_378_);
v___x_380_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_379_);
return v___x_380_;
}
}
}
static double _init_lp_algalVerification_Algal_Expr_asIndex___closed__1(void){
_start:
{
lean_object* v___x_382_; double v___x_383_; 
v___x_382_ = lean_unsigned_to_nat(0u);
v___x_383_ = lean_float_of_nat(v___x_382_);
return v___x_383_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asIndex(lean_object* v_op_384_, lean_object* v_arg_385_, lean_object* v_v_386_){
_start:
{
if (lean_obj_tag(v_v_386_) == 2)
{
uint64_t v_value_392_; double v_f_393_; double v___x_394_; uint8_t v___x_395_; 
v_value_392_ = lean_ctor_get_uint64(v_v_386_, 0);
v_f_393_ = lean_float_of_bits(v_value_392_);
v___x_394_ = lean_float_once(&lp_algalVerification_Algal_Expr_asIndex___closed__1, &lp_algalVerification_Algal_Expr_asIndex___closed__1_once, _init_lp_algalVerification_Algal_Expr_asIndex___closed__1);
v___x_395_ = lean_float_decLe(v___x_394_, v_f_393_);
if (v___x_395_ == 0)
{
goto v___jp_387_;
}
else
{
double v___x_396_; double v___x_397_; uint8_t v___x_398_; 
v___x_396_ = floor(v_f_393_);
v___x_397_ = lean_float_sub(v_f_393_, v___x_396_);
v___x_398_ = lean_float_beq(v___x_397_, v___x_394_);
if (v___x_398_ == 0)
{
goto v___jp_387_;
}
else
{
lean_object* v___x_399_; lean_object* v___x_400_; lean_object* v___x_401_; lean_object* v___x_402_; 
lean_dec(v_arg_385_);
lean_dec_ref(v_op_384_);
v___x_399_ = lean_box_float(v_f_393_);
v___x_400_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_400_, 0, v___x_399_);
v___x_401_ = lean_box(0);
v___x_402_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_402_, 0, v___x_400_);
lean_ctor_set(v___x_402_, 1, v___x_401_);
return v___x_402_;
}
}
}
else
{
lean_object* v___x_403_; lean_object* v___x_404_; lean_object* v___x_405_; lean_object* v___x_406_; 
v___x_403_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asIndex___closed__0));
v___x_404_ = lp_algalVerification_Algal_Expr_kindOf(v_v_386_);
v___x_405_ = lp_algalVerification_Algal_Expr_errType(v_op_384_, v_arg_385_, v___x_403_, v___x_404_);
v___x_406_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_405_);
return v___x_406_;
}
v___jp_387_:
{
lean_object* v___x_388_; lean_object* v___x_389_; lean_object* v___x_390_; lean_object* v___x_391_; 
v___x_388_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asIndex___closed__0));
v___x_389_ = lp_algalVerification_Algal_Expr_kindOf(v_v_386_);
v___x_390_ = lp_algalVerification_Algal_Expr_errType(v_op_384_, v_arg_385_, v___x_388_, v___x_389_);
v___x_391_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_390_);
return v___x_391_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asIndex___boxed(lean_object* v_op_407_, lean_object* v_arg_408_, lean_object* v_v_409_){
_start:
{
lean_object* v_res_410_; 
v_res_410_ = lp_algalVerification_Algal_Expr_asIndex(v_op_407_, v_arg_408_, v_v_409_);
lean_dec(v_v_409_);
return v_res_410_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_emitNum(lean_object* v_op_411_, double v_f_412_){
_start:
{
lean_object* v___x_413_; 
v___x_413_ = lp_algalVerification_Algal_Expr_admitNum(v_f_412_);
if (lean_obj_tag(v___x_413_) == 0)
{
lean_object* v___x_414_; lean_object* v___x_415_; 
v___x_414_ = lp_algalVerification_Algal_Expr_errNum(v_op_411_);
v___x_415_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_414_);
return v___x_415_;
}
else
{
lean_object* v_val_416_; lean_object* v___x_418_; uint8_t v_isShared_419_; uint8_t v_isSharedCheck_427_; 
lean_dec_ref(v_op_411_);
v_val_416_ = lean_ctor_get(v___x_413_, 0);
v_isSharedCheck_427_ = !lean_is_exclusive(v___x_413_);
if (v_isSharedCheck_427_ == 0)
{
v___x_418_ = v___x_413_;
v_isShared_419_ = v_isSharedCheck_427_;
goto v_resetjp_417_;
}
else
{
lean_inc(v_val_416_);
lean_dec(v___x_413_);
v___x_418_ = lean_box(0);
v_isShared_419_ = v_isSharedCheck_427_;
goto v_resetjp_417_;
}
v_resetjp_417_:
{
lean_object* v___x_420_; uint64_t v___x_421_; lean_object* v___x_423_; 
v___x_420_ = lean_alloc_ctor(2, 0, 8);
v___x_421_ = lean_unbox_uint64(v_val_416_);
lean_dec(v_val_416_);
lean_ctor_set_uint64(v___x_420_, 0, v___x_421_);
if (v_isShared_419_ == 0)
{
lean_ctor_set(v___x_418_, 0, v___x_420_);
v___x_423_ = v___x_418_;
goto v_reusejp_422_;
}
else
{
lean_object* v_reuseFailAlloc_426_; 
v_reuseFailAlloc_426_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_426_, 0, v___x_420_);
v___x_423_ = v_reuseFailAlloc_426_;
goto v_reusejp_422_;
}
v_reusejp_422_:
{
lean_object* v___x_424_; lean_object* v___x_425_; 
v___x_424_ = lean_box(0);
v___x_425_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_425_, 0, v___x_423_);
lean_ctor_set(v___x_425_, 1, v___x_424_);
return v___x_425_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_emitNum___boxed(lean_object* v_op_428_, lean_object* v_f_429_){
_start:
{
double v_f_boxed_430_; lean_object* v_res_431_; 
v_f_boxed_430_ = lean_unbox_float(v_f_429_);
lean_dec_ref(v_f_429_);
v_res_431_ = lp_algalVerification_Algal_Expr_emitNum(v_op_428_, v_f_boxed_430_);
return v_res_431_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_binderName(lean_object* v_x_433_){
_start:
{
if (lean_obj_tag(v_x_433_) == 3)
{
lean_object* v_value_434_; 
v_value_434_ = lean_ctor_get(v_x_433_, 0);
lean_inc_ref(v_value_434_);
return v_value_434_;
}
else
{
lean_object* v___x_435_; 
v___x_435_ = ((lean_object*)(lp_algalVerification_Algal_Expr_binderName___closed__0));
return v___x_435_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_binderName___boxed(lean_object* v_x_436_){
_start:
{
lean_object* v_res_437_; 
v_res_437_ = lp_algalVerification_Algal_Expr_binderName(v_x_436_);
lean_dec(v_x_436_);
return v_res_437_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_arityWant(lean_object* v_lo_439_, lean_object* v_x_440_){
_start:
{
if (lean_obj_tag(v_x_440_) == 0)
{
lean_object* v___x_441_; lean_object* v___x_442_; lean_object* v___x_443_; 
v___x_441_ = l_Nat_reprFast(v_lo_439_);
v___x_442_ = ((lean_object*)(lp_algalVerification_Algal_Expr_arityWant___closed__0));
v___x_443_ = lean_string_append(v___x_441_, v___x_442_);
return v___x_443_;
}
else
{
lean_object* v_val_444_; lean_object* v___x_445_; lean_object* v___x_446_; lean_object* v___x_447_; lean_object* v___x_448_; lean_object* v___x_449_; 
v_val_444_ = lean_ctor_get(v_x_440_, 0);
lean_inc(v_val_444_);
lean_dec_ref_known(v_x_440_, 1);
v___x_445_ = l_Nat_reprFast(v_lo_439_);
v___x_446_ = ((lean_object*)(lp_algalVerification_Algal_Expr_arityWant___closed__0));
v___x_447_ = lean_string_append(v___x_445_, v___x_446_);
v___x_448_ = l_Nat_reprFast(v_val_444_);
v___x_449_ = lean_string_append(v___x_447_, v___x_448_);
lean_dec_ref(v___x_448_);
return v___x_449_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_checkArity(lean_object* v_op_453_, lean_object* v_args_454_, lean_object* v_lo_455_, lean_object* v_hi_456_){
_start:
{
lean_object* v_argc_457_; lean_object* v___y_463_; uint8_t v___x_466_; 
v_argc_457_ = lp_algalVerification_Algal_Expr_itemsLength(v_args_454_);
v___x_466_ = lean_nat_dec_le(v_lo_455_, v_argc_457_);
if (v___x_466_ == 0)
{
goto v___jp_458_;
}
else
{
if (lean_obj_tag(v_hi_456_) == 0)
{
lean_inc(v_argc_457_);
v___y_463_ = v_argc_457_;
goto v___jp_462_;
}
else
{
lean_object* v_val_467_; 
v_val_467_ = lean_ctor_get(v_hi_456_, 0);
lean_inc(v_val_467_);
v___y_463_ = v_val_467_;
goto v___jp_462_;
}
}
v___jp_458_:
{
lean_object* v___x_459_; lean_object* v___x_460_; lean_object* v___x_461_; 
v___x_459_ = lp_algalVerification_Algal_Expr_arityWant(v_lo_455_, v_hi_456_);
v___x_460_ = lp_algalVerification_Algal_Expr_errArity(v_op_453_, v___x_459_, v_argc_457_);
v___x_461_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_460_);
return v___x_461_;
}
v___jp_462_:
{
uint8_t v___x_464_; 
v___x_464_ = lean_nat_dec_le(v_argc_457_, v___y_463_);
lean_dec(v___y_463_);
if (v___x_464_ == 0)
{
goto v___jp_458_;
}
else
{
lean_object* v___x_465_; 
lean_dec(v_argc_457_);
lean_dec(v_hi_456_);
lean_dec(v_lo_455_);
lean_dec_ref(v_op_453_);
v___x_465_ = ((lean_object*)(lp_algalVerification_Algal_Expr_checkArity___closed__0));
return v___x_465_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_checkArity___boxed(lean_object* v_op_468_, lean_object* v_args_469_, lean_object* v_lo_470_, lean_object* v_hi_471_){
_start:
{
lean_object* v_res_472_; 
v_res_472_ = lp_algalVerification_Algal_Expr_checkArity(v_op_468_, v_args_469_, v_lo_470_, v_hi_471_);
lean_dec(v_args_469_);
return v_res_472_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_baseCost(lean_object* v_op_486_, lean_object* v_argc_487_){
_start:
{
lean_object* v___x_488_; uint8_t v___x_489_; 
v___x_488_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__0));
v___x_489_ = lean_string_dec_eq(v_op_486_, v___x_488_);
if (v___x_489_ == 0)
{
lean_object* v___x_490_; uint8_t v___x_491_; 
v___x_490_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__1));
v___x_491_ = lean_string_dec_eq(v_op_486_, v___x_490_);
if (v___x_491_ == 0)
{
lean_object* v___x_492_; uint8_t v___x_493_; 
v___x_492_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__2));
v___x_493_ = lean_string_dec_eq(v_op_486_, v___x_492_);
if (v___x_493_ == 0)
{
lean_object* v___x_494_; uint8_t v___x_495_; 
v___x_494_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__3));
v___x_495_ = lean_string_dec_eq(v_op_486_, v___x_494_);
if (v___x_495_ == 0)
{
lean_object* v___x_496_; uint8_t v___x_497_; 
v___x_496_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__4));
v___x_497_ = lean_string_dec_eq(v_op_486_, v___x_496_);
if (v___x_497_ == 0)
{
lean_object* v___x_498_; uint8_t v___x_499_; 
v___x_498_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__5));
v___x_499_ = lean_string_dec_eq(v_op_486_, v___x_498_);
if (v___x_499_ == 0)
{
lean_object* v___x_500_; uint8_t v___x_501_; 
v___x_500_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asList___closed__0));
v___x_501_ = lean_string_dec_eq(v_op_486_, v___x_500_);
if (v___x_501_ == 0)
{
lean_object* v___x_502_; uint8_t v___x_503_; 
v___x_502_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__6));
v___x_503_ = lean_string_dec_eq(v_op_486_, v___x_502_);
if (v___x_503_ == 0)
{
lean_object* v___x_504_; uint8_t v___x_505_; 
v___x_504_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__7));
v___x_505_ = lean_string_dec_eq(v_op_486_, v___x_504_);
if (v___x_505_ == 0)
{
lean_object* v___x_506_; uint8_t v___x_507_; 
v___x_506_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__8));
v___x_507_ = lean_string_dec_eq(v_op_486_, v___x_506_);
if (v___x_507_ == 0)
{
lean_object* v___x_508_; uint8_t v___x_509_; 
v___x_508_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__9));
v___x_509_ = lean_string_dec_eq(v_op_486_, v___x_508_);
if (v___x_509_ == 0)
{
lean_object* v___x_510_; uint8_t v___x_511_; 
v___x_510_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__10));
v___x_511_ = lean_string_dec_eq(v_op_486_, v___x_510_);
if (v___x_511_ == 0)
{
lean_object* v___x_512_; uint8_t v___x_513_; 
v___x_512_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__11));
v___x_513_ = lean_string_dec_eq(v_op_486_, v___x_512_);
if (v___x_513_ == 0)
{
lean_object* v___x_514_; uint8_t v___x_515_; 
v___x_514_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__12));
v___x_515_ = lean_string_dec_eq(v_op_486_, v___x_514_);
if (v___x_515_ == 0)
{
lean_object* v___x_516_; 
v___x_516_ = lean_unsigned_to_nat(2u);
return v___x_516_;
}
else
{
lean_object* v___x_517_; lean_object* v___x_518_; 
v___x_517_ = lean_unsigned_to_nat(2u);
v___x_518_ = lean_nat_add(v___x_517_, v_argc_487_);
return v___x_518_;
}
}
else
{
lean_object* v___x_519_; 
v___x_519_ = lean_unsigned_to_nat(1u);
return v___x_519_;
}
}
else
{
lean_object* v___x_520_; 
v___x_520_ = lean_unsigned_to_nat(1u);
return v___x_520_;
}
}
else
{
lean_object* v___x_521_; 
v___x_521_ = lean_unsigned_to_nat(1u);
return v___x_521_;
}
}
else
{
lean_object* v___x_522_; 
v___x_522_ = lean_unsigned_to_nat(1u);
return v___x_522_;
}
}
else
{
lean_object* v___x_523_; 
v___x_523_ = lean_unsigned_to_nat(1u);
return v___x_523_;
}
}
else
{
lean_object* v___x_524_; 
v___x_524_ = lean_unsigned_to_nat(1u);
return v___x_524_;
}
}
else
{
lean_object* v___x_525_; 
v___x_525_ = lean_unsigned_to_nat(1u);
return v___x_525_;
}
}
else
{
lean_object* v___x_526_; 
v___x_526_ = lean_unsigned_to_nat(1u);
return v___x_526_;
}
}
else
{
lean_object* v___x_527_; 
v___x_527_ = lean_unsigned_to_nat(1u);
return v___x_527_;
}
}
else
{
lean_object* v___x_528_; 
v___x_528_ = lean_unsigned_to_nat(1u);
return v___x_528_;
}
}
else
{
lean_object* v___x_529_; 
v___x_529_ = lean_unsigned_to_nat(1u);
return v___x_529_;
}
}
else
{
lean_object* v___x_530_; 
v___x_530_ = lean_unsigned_to_nat(1u);
return v___x_530_;
}
}
else
{
lean_object* v___x_531_; 
v___x_531_ = lean_unsigned_to_nat(1u);
return v___x_531_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_baseCost___boxed(lean_object* v_op_532_, lean_object* v_argc_533_){
_start:
{
lean_object* v_res_534_; 
v_res_534_ = lp_algalVerification_Algal_Expr_baseCost(v_op_532_, v_argc_533_);
lean_dec(v_argc_533_);
lean_dec_ref(v_op_532_);
return v_res_534_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_numFold(lean_object* v_op_535_, lean_object* v_f_536_, double v_acc_537_, lean_object* v_items_538_, lean_object* v_i_539_){
_start:
{
if (lean_obj_tag(v_items_538_) == 0)
{
lean_object* v___x_540_; lean_object* v___x_541_; 
lean_dec(v_i_539_);
lean_dec_ref(v_f_536_);
lean_dec_ref(v_op_535_);
v___x_540_ = lean_box_float(v_acc_537_);
v___x_541_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_541_, 0, v___x_540_);
return v___x_541_;
}
else
{
lean_object* v_value_542_; 
v_value_542_ = lean_ctor_get(v_items_538_, 0);
if (lean_obj_tag(v_value_542_) == 2)
{
lean_object* v_rest_543_; uint64_t v_value_544_; double v___x_545_; lean_object* v___x_546_; lean_object* v___x_547_; lean_object* v___x_548_; lean_object* v___x_549_; lean_object* v___x_550_; double v___x_551_; 
v_rest_543_ = lean_ctor_get(v_items_538_, 1);
v_value_544_ = lean_ctor_get_uint64(v_value_542_, 0);
v___x_545_ = lean_float_of_bits(v_value_544_);
v___x_546_ = lean_box_float(v_acc_537_);
v___x_547_ = lean_box_float(v___x_545_);
lean_inc_ref(v_f_536_);
v___x_548_ = lean_apply_2(v_f_536_, v___x_546_, v___x_547_);
v___x_549_ = lean_unsigned_to_nat(1u);
v___x_550_ = lean_nat_add(v_i_539_, v___x_549_);
lean_dec(v_i_539_);
v___x_551_ = lean_unbox_float(v___x_548_);
lean_dec_ref(v___x_548_);
v_acc_537_ = v___x_551_;
v_items_538_ = v_rest_543_;
v_i_539_ = v___x_550_;
goto _start;
}
else
{
lean_object* v___x_553_; lean_object* v___x_554_; lean_object* v___x_555_; lean_object* v___x_556_; 
lean_dec_ref(v_f_536_);
v___x_553_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asNum___closed__0));
v___x_554_ = lp_algalVerification_Algal_Expr_kindOf(v_value_542_);
v___x_555_ = lp_algalVerification_Algal_Expr_errType(v_op_535_, v_i_539_, v___x_553_, v___x_554_);
v___x_556_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_556_, 0, v___x_555_);
return v___x_556_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_numFold___boxed(lean_object* v_op_557_, lean_object* v_f_558_, lean_object* v_acc_559_, lean_object* v_items_560_, lean_object* v_i_561_){
_start:
{
double v_acc_boxed_562_; lean_object* v_res_563_; 
v_acc_boxed_562_ = lean_unbox_float(v_acc_559_);
lean_dec_ref(v_acc_559_);
v_res_563_ = lp_algalVerification_Algal_Expr_numFold(v_op_557_, v_f_558_, v_acc_boxed_562_, v_items_560_, v_i_561_);
lean_dec(v_items_560_);
return v_res_563_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_minMaxFold___closed__0(void){
_start:
{
uint8_t v___x_564_; lean_object* v___x_565_; 
v___x_564_ = 3;
v___x_565_ = lp_algalVerification_Algal_Expr_err(v___x_564_);
return v___x_565_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_minMaxFold___closed__1(void){
_start:
{
lean_object* v___x_566_; lean_object* v___x_567_; 
v___x_566_ = lean_obj_once(&lp_algalVerification_Algal_Expr_minMaxFold___closed__0, &lp_algalVerification_Algal_Expr_minMaxFold___closed__0_once, _init_lp_algalVerification_Algal_Expr_minMaxFold___closed__0);
v___x_567_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_567_, 0, v___x_566_);
return v___x_567_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_minMaxFold(lean_object* v_op_568_, lean_object* v_f_569_, lean_object* v_items_570_){
_start:
{
if (lean_obj_tag(v_items_570_) == 0)
{
lean_object* v___x_571_; 
lean_dec_ref(v_f_569_);
lean_dec_ref(v_op_568_);
v___x_571_ = lean_obj_once(&lp_algalVerification_Algal_Expr_minMaxFold___closed__1, &lp_algalVerification_Algal_Expr_minMaxFold___closed__1_once, _init_lp_algalVerification_Algal_Expr_minMaxFold___closed__1);
return v___x_571_;
}
else
{
lean_object* v_value_572_; 
v_value_572_ = lean_ctor_get(v_items_570_, 0);
if (lean_obj_tag(v_value_572_) == 2)
{
lean_object* v_rest_573_; uint64_t v_value_574_; double v___x_575_; lean_object* v___x_576_; lean_object* v___x_577_; 
v_rest_573_ = lean_ctor_get(v_items_570_, 1);
v_value_574_ = lean_ctor_get_uint64(v_value_572_, 0);
v___x_575_ = lean_float_of_bits(v_value_574_);
v___x_576_ = lean_unsigned_to_nat(1u);
v___x_577_ = lp_algalVerification_Algal_Expr_numFold(v_op_568_, v_f_569_, v___x_575_, v_rest_573_, v___x_576_);
return v___x_577_;
}
else
{
lean_object* v___x_578_; lean_object* v___x_579_; lean_object* v___x_580_; lean_object* v___x_581_; lean_object* v___x_582_; 
lean_dec_ref(v_f_569_);
v___x_578_ = lean_unsigned_to_nat(0u);
v___x_579_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asNum___closed__0));
v___x_580_ = lp_algalVerification_Algal_Expr_kindOf(v_value_572_);
v___x_581_ = lp_algalVerification_Algal_Expr_errType(v_op_568_, v___x_578_, v___x_579_, v___x_580_);
v___x_582_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_582_, 0, v___x_581_);
return v___x_582_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_minMaxFold___boxed(lean_object* v_op_583_, lean_object* v_f_584_, lean_object* v_items_585_){
_start:
{
lean_object* v_res_586_; 
v_res_586_ = lp_algalVerification_Algal_Expr_minMaxFold(v_op_583_, v_f_584_, v_items_585_);
lean_dec(v_items_585_);
return v_res_586_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_containsLoop(lean_object* v_v_594_, lean_object* v_x_595_){
_start:
{
if (lean_obj_tag(v_x_595_) == 0)
{
lean_object* v___x_596_; 
lean_dec(v_v_594_);
v___x_596_ = ((lean_object*)(lp_algalVerification_Algal_Expr_containsLoop___closed__0));
return v___x_596_;
}
else
{
lean_object* v_value_597_; lean_object* v_rest_598_; lean_object* v___x_600_; uint8_t v_isShared_601_; uint8_t v_isSharedCheck_622_; 
v_value_597_ = lean_ctor_get(v_x_595_, 0);
v_rest_598_ = lean_ctor_get(v_x_595_, 1);
v_isSharedCheck_622_ = !lean_is_exclusive(v_x_595_);
if (v_isSharedCheck_622_ == 0)
{
v___x_600_ = v_x_595_;
v_isShared_601_ = v_isSharedCheck_622_;
goto v_resetjp_599_;
}
else
{
lean_inc(v_rest_598_);
lean_inc(v_value_597_);
lean_dec(v_x_595_);
v___x_600_ = lean_box(0);
v_isShared_601_ = v_isSharedCheck_622_;
goto v_resetjp_599_;
}
v_resetjp_599_:
{
uint8_t v___x_602_; 
lean_inc(v_v_594_);
v___x_602_ = lp_algalVerification_Algal_Expr_eqv(v_value_597_, v_v_594_);
if (v___x_602_ == 0)
{
lean_object* v___x_603_; lean_object* v_fst_604_; lean_object* v_snd_605_; lean_object* v___x_607_; uint8_t v_isShared_608_; uint8_t v_isSharedCheck_616_; 
v___x_603_ = lp_algalVerification_Algal_Expr_containsLoop(v_v_594_, v_rest_598_);
v_fst_604_ = lean_ctor_get(v___x_603_, 0);
v_snd_605_ = lean_ctor_get(v___x_603_, 1);
v_isSharedCheck_616_ = !lean_is_exclusive(v___x_603_);
if (v_isSharedCheck_616_ == 0)
{
v___x_607_ = v___x_603_;
v_isShared_608_ = v_isSharedCheck_616_;
goto v_resetjp_606_;
}
else
{
lean_inc(v_snd_605_);
lean_inc(v_fst_604_);
lean_dec(v___x_603_);
v___x_607_ = lean_box(0);
v_isShared_608_ = v_isSharedCheck_616_;
goto v_resetjp_606_;
}
v_resetjp_606_:
{
lean_object* v___x_609_; lean_object* v___x_611_; 
v___x_609_ = lean_unsigned_to_nat(1u);
if (v_isShared_601_ == 0)
{
lean_ctor_set(v___x_600_, 1, v_snd_605_);
lean_ctor_set(v___x_600_, 0, v___x_609_);
v___x_611_ = v___x_600_;
goto v_reusejp_610_;
}
else
{
lean_object* v_reuseFailAlloc_615_; 
v_reuseFailAlloc_615_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_615_, 0, v___x_609_);
lean_ctor_set(v_reuseFailAlloc_615_, 1, v_snd_605_);
v___x_611_ = v_reuseFailAlloc_615_;
goto v_reusejp_610_;
}
v_reusejp_610_:
{
lean_object* v___x_613_; 
if (v_isShared_608_ == 0)
{
lean_ctor_set(v___x_607_, 1, v___x_611_);
v___x_613_ = v___x_607_;
goto v_reusejp_612_;
}
else
{
lean_object* v_reuseFailAlloc_614_; 
v_reuseFailAlloc_614_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_614_, 0, v_fst_604_);
lean_ctor_set(v_reuseFailAlloc_614_, 1, v___x_611_);
v___x_613_ = v_reuseFailAlloc_614_;
goto v_reusejp_612_;
}
v_reusejp_612_:
{
return v___x_613_;
}
}
}
}
else
{
lean_object* v___x_617_; lean_object* v___x_618_; lean_object* v___x_620_; 
lean_dec(v_rest_598_);
lean_dec(v_v_594_);
v___x_617_ = ((lean_object*)(lp_algalVerification_Algal_Expr_containsLoop___closed__1));
v___x_618_ = lean_box(v___x_602_);
if (v_isShared_601_ == 0)
{
lean_ctor_set_tag(v___x_600_, 0);
lean_ctor_set(v___x_600_, 1, v___x_617_);
lean_ctor_set(v___x_600_, 0, v___x_618_);
v___x_620_ = v___x_600_;
goto v_reusejp_619_;
}
else
{
lean_object* v_reuseFailAlloc_621_; 
v_reuseFailAlloc_621_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_621_, 0, v___x_618_);
lean_ctor_set(v_reuseFailAlloc_621_, 1, v___x_617_);
v___x_620_ = v_reuseFailAlloc_621_;
goto v_reusejp_619_;
}
v_reusejp_619_:
{
return v___x_620_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_uniqueSeen(lean_object* v_x_623_, lean_object* v_x_624_){
_start:
{
if (lean_obj_tag(v_x_624_) == 0)
{
lean_object* v___x_625_; 
lean_dec(v_x_623_);
v___x_625_ = ((lean_object*)(lp_algalVerification_Algal_Expr_containsLoop___closed__0));
return v___x_625_;
}
else
{
lean_object* v_value_626_; lean_object* v_rest_627_; lean_object* v___x_629_; uint8_t v_isShared_630_; uint8_t v_isSharedCheck_651_; 
v_value_626_ = lean_ctor_get(v_x_624_, 0);
v_rest_627_ = lean_ctor_get(v_x_624_, 1);
v_isSharedCheck_651_ = !lean_is_exclusive(v_x_624_);
if (v_isSharedCheck_651_ == 0)
{
v___x_629_ = v_x_624_;
v_isShared_630_ = v_isSharedCheck_651_;
goto v_resetjp_628_;
}
else
{
lean_inc(v_rest_627_);
lean_inc(v_value_626_);
lean_dec(v_x_624_);
v___x_629_ = lean_box(0);
v_isShared_630_ = v_isSharedCheck_651_;
goto v_resetjp_628_;
}
v_resetjp_628_:
{
uint8_t v___x_631_; 
lean_inc(v_x_623_);
v___x_631_ = lp_algalVerification_Algal_Expr_eqv(v_value_626_, v_x_623_);
if (v___x_631_ == 0)
{
lean_object* v___x_632_; lean_object* v_fst_633_; lean_object* v_snd_634_; lean_object* v___x_636_; uint8_t v_isShared_637_; uint8_t v_isSharedCheck_645_; 
v___x_632_ = lp_algalVerification_Algal_Expr_uniqueSeen(v_x_623_, v_rest_627_);
v_fst_633_ = lean_ctor_get(v___x_632_, 0);
v_snd_634_ = lean_ctor_get(v___x_632_, 1);
v_isSharedCheck_645_ = !lean_is_exclusive(v___x_632_);
if (v_isSharedCheck_645_ == 0)
{
v___x_636_ = v___x_632_;
v_isShared_637_ = v_isSharedCheck_645_;
goto v_resetjp_635_;
}
else
{
lean_inc(v_snd_634_);
lean_inc(v_fst_633_);
lean_dec(v___x_632_);
v___x_636_ = lean_box(0);
v_isShared_637_ = v_isSharedCheck_645_;
goto v_resetjp_635_;
}
v_resetjp_635_:
{
lean_object* v___x_638_; lean_object* v___x_640_; 
v___x_638_ = lean_unsigned_to_nat(1u);
if (v_isShared_630_ == 0)
{
lean_ctor_set(v___x_629_, 1, v_snd_634_);
lean_ctor_set(v___x_629_, 0, v___x_638_);
v___x_640_ = v___x_629_;
goto v_reusejp_639_;
}
else
{
lean_object* v_reuseFailAlloc_644_; 
v_reuseFailAlloc_644_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_644_, 0, v___x_638_);
lean_ctor_set(v_reuseFailAlloc_644_, 1, v_snd_634_);
v___x_640_ = v_reuseFailAlloc_644_;
goto v_reusejp_639_;
}
v_reusejp_639_:
{
lean_object* v___x_642_; 
if (v_isShared_637_ == 0)
{
lean_ctor_set(v___x_636_, 1, v___x_640_);
v___x_642_ = v___x_636_;
goto v_reusejp_641_;
}
else
{
lean_object* v_reuseFailAlloc_643_; 
v_reuseFailAlloc_643_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_643_, 0, v_fst_633_);
lean_ctor_set(v_reuseFailAlloc_643_, 1, v___x_640_);
v___x_642_ = v_reuseFailAlloc_643_;
goto v_reusejp_641_;
}
v_reusejp_641_:
{
return v___x_642_;
}
}
}
}
else
{
lean_object* v___x_646_; lean_object* v___x_647_; lean_object* v___x_649_; 
lean_dec(v_rest_627_);
lean_dec(v_x_623_);
v___x_646_ = ((lean_object*)(lp_algalVerification_Algal_Expr_containsLoop___closed__1));
v___x_647_ = lean_box(v___x_631_);
if (v_isShared_630_ == 0)
{
lean_ctor_set_tag(v___x_629_, 0);
lean_ctor_set(v___x_629_, 1, v___x_646_);
lean_ctor_set(v___x_629_, 0, v___x_647_);
v___x_649_ = v___x_629_;
goto v_reusejp_648_;
}
else
{
lean_object* v_reuseFailAlloc_650_; 
v_reuseFailAlloc_650_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_650_, 0, v___x_647_);
lean_ctor_set(v_reuseFailAlloc_650_, 1, v___x_646_);
v___x_649_ = v_reuseFailAlloc_650_;
goto v_reusejp_648_;
}
v_reusejp_648_:
{
return v___x_649_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_uniqueLoop(lean_object* v_x_652_, lean_object* v_x_653_){
_start:
{
if (lean_obj_tag(v_x_652_) == 0)
{
lean_object* v___x_654_; lean_object* v___x_655_; 
v___x_654_ = lean_box(0);
v___x_655_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_655_, 0, v_x_653_);
lean_ctor_set(v___x_655_, 1, v___x_654_);
return v___x_655_;
}
else
{
lean_object* v_value_656_; lean_object* v_rest_657_; lean_object* v___x_659_; uint8_t v_isShared_660_; uint8_t v_isSharedCheck_693_; 
v_value_656_ = lean_ctor_get(v_x_652_, 0);
v_rest_657_ = lean_ctor_get(v_x_652_, 1);
v_isSharedCheck_693_ = !lean_is_exclusive(v_x_652_);
if (v_isSharedCheck_693_ == 0)
{
v___x_659_ = v_x_652_;
v_isShared_660_ = v_isSharedCheck_693_;
goto v_resetjp_658_;
}
else
{
lean_inc(v_rest_657_);
lean_inc(v_value_656_);
lean_dec(v_x_652_);
v___x_659_ = lean_box(0);
v_isShared_660_ = v_isSharedCheck_693_;
goto v_resetjp_658_;
}
v_resetjp_658_:
{
lean_object* v___x_661_; lean_object* v_fst_662_; uint8_t v___x_663_; 
lean_inc(v_x_653_);
lean_inc(v_value_656_);
v___x_661_ = lp_algalVerification_Algal_Expr_uniqueSeen(v_value_656_, v_x_653_);
v_fst_662_ = lean_ctor_get(v___x_661_, 0);
lean_inc(v_fst_662_);
v___x_663_ = lean_unbox(v_fst_662_);
lean_dec(v_fst_662_);
if (v___x_663_ == 0)
{
lean_object* v_snd_664_; lean_object* v___x_665_; lean_object* v___x_667_; 
v_snd_664_ = lean_ctor_get(v___x_661_, 1);
lean_inc(v_snd_664_);
lean_dec_ref(v___x_661_);
v___x_665_ = lean_box(0);
if (v_isShared_660_ == 0)
{
lean_ctor_set(v___x_659_, 1, v___x_665_);
v___x_667_ = v___x_659_;
goto v_reusejp_666_;
}
else
{
lean_object* v_reuseFailAlloc_680_; 
v_reuseFailAlloc_680_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_680_, 0, v_value_656_);
lean_ctor_set(v_reuseFailAlloc_680_, 1, v___x_665_);
v___x_667_ = v_reuseFailAlloc_680_;
goto v_reusejp_666_;
}
v_reusejp_666_:
{
lean_object* v___x_668_; lean_object* v___x_669_; lean_object* v_fst_670_; lean_object* v_snd_671_; lean_object* v___x_673_; uint8_t v_isShared_674_; uint8_t v_isSharedCheck_679_; 
v___x_668_ = lp_algalVerification_Algal_Expr_itemsAppend(v_x_653_, v___x_667_);
lean_dec_ref(v___x_667_);
v___x_669_ = lp_algalVerification_Algal_Expr_uniqueLoop(v_rest_657_, v___x_668_);
v_fst_670_ = lean_ctor_get(v___x_669_, 0);
v_snd_671_ = lean_ctor_get(v___x_669_, 1);
v_isSharedCheck_679_ = !lean_is_exclusive(v___x_669_);
if (v_isSharedCheck_679_ == 0)
{
v___x_673_ = v___x_669_;
v_isShared_674_ = v_isSharedCheck_679_;
goto v_resetjp_672_;
}
else
{
lean_inc(v_snd_671_);
lean_inc(v_fst_670_);
lean_dec(v___x_669_);
v___x_673_ = lean_box(0);
v_isShared_674_ = v_isSharedCheck_679_;
goto v_resetjp_672_;
}
v_resetjp_672_:
{
lean_object* v___x_675_; lean_object* v___x_677_; 
v___x_675_ = l_List_appendTR___redArg(v_snd_664_, v_snd_671_);
if (v_isShared_674_ == 0)
{
lean_ctor_set(v___x_673_, 1, v___x_675_);
v___x_677_ = v___x_673_;
goto v_reusejp_676_;
}
else
{
lean_object* v_reuseFailAlloc_678_; 
v_reuseFailAlloc_678_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_678_, 0, v_fst_670_);
lean_ctor_set(v_reuseFailAlloc_678_, 1, v___x_675_);
v___x_677_ = v_reuseFailAlloc_678_;
goto v_reusejp_676_;
}
v_reusejp_676_:
{
return v___x_677_;
}
}
}
}
else
{
lean_object* v_snd_681_; lean_object* v___x_682_; lean_object* v_fst_683_; lean_object* v_snd_684_; lean_object* v___x_686_; uint8_t v_isShared_687_; uint8_t v_isSharedCheck_692_; 
lean_del_object(v___x_659_);
lean_dec(v_value_656_);
v_snd_681_ = lean_ctor_get(v___x_661_, 1);
lean_inc(v_snd_681_);
lean_dec_ref(v___x_661_);
v___x_682_ = lp_algalVerification_Algal_Expr_uniqueLoop(v_rest_657_, v_x_653_);
v_fst_683_ = lean_ctor_get(v___x_682_, 0);
v_snd_684_ = lean_ctor_get(v___x_682_, 1);
v_isSharedCheck_692_ = !lean_is_exclusive(v___x_682_);
if (v_isSharedCheck_692_ == 0)
{
v___x_686_ = v___x_682_;
v_isShared_687_ = v_isSharedCheck_692_;
goto v_resetjp_685_;
}
else
{
lean_inc(v_snd_684_);
lean_inc(v_fst_683_);
lean_dec(v___x_682_);
v___x_686_ = lean_box(0);
v_isShared_687_ = v_isSharedCheck_692_;
goto v_resetjp_685_;
}
v_resetjp_685_:
{
lean_object* v___x_688_; lean_object* v___x_690_; 
v___x_688_ = l_List_appendTR___redArg(v_snd_681_, v_snd_684_);
if (v_isShared_687_ == 0)
{
lean_ctor_set(v___x_686_, 1, v___x_688_);
v___x_690_ = v___x_686_;
goto v_reusejp_689_;
}
else
{
lean_object* v_reuseFailAlloc_691_; 
v_reuseFailAlloc_691_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_691_, 0, v_fst_683_);
lean_ctor_set(v_reuseFailAlloc_691_, 1, v___x_688_);
v___x_690_ = v_reuseFailAlloc_691_;
goto v_reusejp_689_;
}
v_reusejp_689_:
{
return v___x_690_;
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_listCount(lean_object* v_op_694_, lean_object* v_items_695_, lean_object* v_i_696_, lean_object* v_total_697_){
_start:
{
if (lean_obj_tag(v_items_695_) == 0)
{
lean_object* v___x_698_; 
lean_dec(v_i_696_);
lean_dec_ref(v_op_694_);
v___x_698_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_698_, 0, v_total_697_);
return v___x_698_;
}
else
{
lean_object* v_value_699_; 
v_value_699_ = lean_ctor_get(v_items_695_, 0);
if (lean_obj_tag(v_value_699_) == 4)
{
lean_object* v_rest_700_; lean_object* v_values_701_; lean_object* v___x_702_; lean_object* v___x_703_; lean_object* v___x_704_; lean_object* v___x_705_; 
v_rest_700_ = lean_ctor_get(v_items_695_, 1);
v_values_701_ = lean_ctor_get(v_value_699_, 0);
v___x_702_ = lean_unsigned_to_nat(1u);
v___x_703_ = lean_nat_add(v_i_696_, v___x_702_);
lean_dec(v_i_696_);
v___x_704_ = lp_algalVerification_Algal_Expr_itemsLength(v_values_701_);
v___x_705_ = lean_nat_add(v_total_697_, v___x_704_);
lean_dec(v___x_704_);
lean_dec(v_total_697_);
v_items_695_ = v_rest_700_;
v_i_696_ = v___x_703_;
v_total_697_ = v___x_705_;
goto _start;
}
else
{
lean_object* v___x_707_; lean_object* v___x_708_; lean_object* v___x_709_; lean_object* v___x_710_; 
lean_dec(v_total_697_);
v___x_707_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asList___closed__0));
v___x_708_ = lp_algalVerification_Algal_Expr_kindOf(v_value_699_);
v___x_709_ = lp_algalVerification_Algal_Expr_errType(v_op_694_, v_i_696_, v___x_707_, v___x_708_);
v___x_710_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_710_, 0, v___x_709_);
return v___x_710_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_listCount___boxed(lean_object* v_op_711_, lean_object* v_items_712_, lean_object* v_i_713_, lean_object* v_total_714_){
_start:
{
lean_object* v_res_715_; 
v_res_715_ = lp_algalVerification_Algal_Expr_listCount(v_op_711_, v_items_712_, v_i_713_, v_total_714_);
lean_dec(v_items_712_);
return v_res_715_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_listsOnto(lean_object* v_acc_716_, lean_object* v_x_717_){
_start:
{
if (lean_obj_tag(v_x_717_) == 0)
{
return v_acc_716_;
}
else
{
lean_object* v_value_718_; 
v_value_718_ = lean_ctor_get(v_x_717_, 0);
if (lean_obj_tag(v_value_718_) == 4)
{
lean_object* v_rest_719_; lean_object* v_values_720_; lean_object* v___x_721_; 
v_rest_719_ = lean_ctor_get(v_x_717_, 1);
v_values_720_ = lean_ctor_get(v_value_718_, 0);
v___x_721_ = lp_algalVerification_Algal_Expr_itemsAppend(v_acc_716_, v_values_720_);
v_acc_716_ = v___x_721_;
v_x_717_ = v_rest_719_;
goto _start;
}
else
{
lean_object* v_rest_723_; 
v_rest_723_ = lean_ctor_get(v_x_717_, 1);
v_x_717_ = v_rest_723_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_listsOnto___boxed(lean_object* v_acc_725_, lean_object* v_x_726_){
_start:
{
lean_object* v_res_727_; 
v_res_727_ = lp_algalVerification_Algal_Expr_listsOnto(v_acc_725_, v_x_726_);
lean_dec(v_x_726_);
return v_res_727_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_strFold(lean_object* v_op_730_, lean_object* v_items_731_, lean_object* v_i_732_){
_start:
{
if (lean_obj_tag(v_items_731_) == 0)
{
lean_object* v___x_733_; 
lean_dec(v_i_732_);
lean_dec_ref(v_op_730_);
v___x_733_ = ((lean_object*)(lp_algalVerification_Algal_Expr_strFold___closed__0));
return v___x_733_;
}
else
{
lean_object* v_value_734_; 
v_value_734_ = lean_ctor_get(v_items_731_, 0);
lean_inc(v_value_734_);
if (lean_obj_tag(v_value_734_) == 3)
{
lean_object* v_rest_735_; lean_object* v___x_737_; uint8_t v_isShared_738_; uint8_t v_isSharedCheck_754_; 
v_rest_735_ = lean_ctor_get(v_items_731_, 1);
v_isSharedCheck_754_ = !lean_is_exclusive(v_items_731_);
if (v_isSharedCheck_754_ == 0)
{
lean_object* v_unused_755_; 
v_unused_755_ = lean_ctor_get(v_items_731_, 0);
lean_dec(v_unused_755_);
v___x_737_ = v_items_731_;
v_isShared_738_ = v_isSharedCheck_754_;
goto v_resetjp_736_;
}
else
{
lean_inc(v_rest_735_);
lean_dec(v_items_731_);
v___x_737_ = lean_box(0);
v_isShared_738_ = v_isSharedCheck_754_;
goto v_resetjp_736_;
}
v_resetjp_736_:
{
lean_object* v_value_739_; lean_object* v___x_740_; lean_object* v___x_741_; lean_object* v___x_742_; 
v_value_739_ = lean_ctor_get(v_value_734_, 0);
lean_inc_ref(v_value_739_);
lean_dec_ref_known(v_value_734_, 1);
v___x_740_ = lean_unsigned_to_nat(1u);
v___x_741_ = lean_nat_add(v_i_732_, v___x_740_);
lean_dec(v_i_732_);
v___x_742_ = lp_algalVerification_Algal_Expr_strFold(v_op_730_, v_rest_735_, v___x_741_);
if (lean_obj_tag(v___x_742_) == 0)
{
lean_dec_ref(v_value_739_);
lean_del_object(v___x_737_);
return v___x_742_;
}
else
{
lean_object* v_a_743_; lean_object* v___x_745_; uint8_t v_isShared_746_; uint8_t v_isSharedCheck_753_; 
v_a_743_ = lean_ctor_get(v___x_742_, 0);
v_isSharedCheck_753_ = !lean_is_exclusive(v___x_742_);
if (v_isSharedCheck_753_ == 0)
{
v___x_745_ = v___x_742_;
v_isShared_746_ = v_isSharedCheck_753_;
goto v_resetjp_744_;
}
else
{
lean_inc(v_a_743_);
lean_dec(v___x_742_);
v___x_745_ = lean_box(0);
v_isShared_746_ = v_isSharedCheck_753_;
goto v_resetjp_744_;
}
v_resetjp_744_:
{
lean_object* v___x_748_; 
if (v_isShared_738_ == 0)
{
lean_ctor_set(v___x_737_, 1, v_a_743_);
lean_ctor_set(v___x_737_, 0, v_value_739_);
v___x_748_ = v___x_737_;
goto v_reusejp_747_;
}
else
{
lean_object* v_reuseFailAlloc_752_; 
v_reuseFailAlloc_752_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_752_, 0, v_value_739_);
lean_ctor_set(v_reuseFailAlloc_752_, 1, v_a_743_);
v___x_748_ = v_reuseFailAlloc_752_;
goto v_reusejp_747_;
}
v_reusejp_747_:
{
lean_object* v___x_750_; 
if (v_isShared_746_ == 0)
{
lean_ctor_set(v___x_745_, 0, v___x_748_);
v___x_750_ = v___x_745_;
goto v_reusejp_749_;
}
else
{
lean_object* v_reuseFailAlloc_751_; 
v_reuseFailAlloc_751_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_751_, 0, v___x_748_);
v___x_750_ = v_reuseFailAlloc_751_;
goto v_reusejp_749_;
}
v_reusejp_749_:
{
return v___x_750_;
}
}
}
}
}
}
else
{
lean_object* v___x_756_; lean_object* v___x_757_; lean_object* v___x_758_; lean_object* v___x_759_; 
lean_dec_ref_known(v_items_731_, 2);
v___x_756_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asStr___closed__0));
v___x_757_ = lp_algalVerification_Algal_Expr_kindOf(v_value_734_);
lean_dec(v_value_734_);
v___x_758_ = lp_algalVerification_Algal_Expr_errType(v_op_730_, v_i_732_, v___x_756_, v___x_757_);
v___x_759_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_759_, 0, v___x_758_);
return v___x_759_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_joinStrs_spec__0(lean_object* v_sep_760_, lean_object* v_x_761_, lean_object* v_x_762_){
_start:
{
if (lean_obj_tag(v_x_762_) == 0)
{
return v_x_761_;
}
else
{
lean_object* v_head_763_; lean_object* v_tail_764_; lean_object* v___x_765_; lean_object* v___x_766_; 
v_head_763_ = lean_ctor_get(v_x_762_, 0);
v_tail_764_ = lean_ctor_get(v_x_762_, 1);
v___x_765_ = lean_string_append(v_x_761_, v_sep_760_);
v___x_766_ = lean_string_append(v___x_765_, v_head_763_);
v_x_761_ = v___x_766_;
v_x_762_ = v_tail_764_;
goto _start;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_joinStrs_spec__0___boxed(lean_object* v_sep_768_, lean_object* v_x_769_, lean_object* v_x_770_){
_start:
{
lean_object* v_res_771_; 
v_res_771_ = lp_algalVerification_List_foldl___at___00Algal_Expr_joinStrs_spec__0(v_sep_768_, v_x_769_, v_x_770_);
lean_dec(v_x_770_);
lean_dec_ref(v_sep_768_);
return v_res_771_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_joinStrs(lean_object* v_sep_772_, lean_object* v_x_773_){
_start:
{
if (lean_obj_tag(v_x_773_) == 0)
{
lean_object* v___x_774_; 
v___x_774_ = ((lean_object*)(lp_algalVerification_Algal_Expr_binderName___closed__0));
return v___x_774_;
}
else
{
lean_object* v_head_775_; lean_object* v_tail_776_; lean_object* v___x_777_; 
v_head_775_ = lean_ctor_get(v_x_773_, 0);
lean_inc(v_head_775_);
v_tail_776_ = lean_ctor_get(v_x_773_, 1);
lean_inc(v_tail_776_);
lean_dec_ref_known(v_x_773_, 2);
v___x_777_ = lp_algalVerification_List_foldl___at___00Algal_Expr_joinStrs_spec__0(v_sep_772_, v_head_775_, v_tail_776_);
lean_dec(v_tail_776_);
return v___x_777_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_joinStrs___boxed(lean_object* v_sep_778_, lean_object* v_x_779_){
_start:
{
lean_object* v_res_780_; 
v_res_780_ = lp_algalVerification_Algal_Expr_joinStrs(v_sep_778_, v_x_779_);
lean_dec_ref(v_sep_778_);
return v_res_780_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_mergeLoop___closed__1(void){
_start:
{
lean_object* v___x_782_; lean_object* v___x_783_; lean_object* v___x_784_; 
v___x_782_ = lean_unsigned_to_nat(256u);
v___x_783_ = ((lean_object*)(lp_algalVerification_Algal_Expr_mergeLoop___closed__0));
v___x_784_ = lp_algalVerification_Algal_Expr_errBounds(v___x_783_, v___x_782_);
return v___x_784_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_mergeLoop___closed__2(void){
_start:
{
lean_object* v___x_785_; lean_object* v___x_786_; 
v___x_785_ = lean_obj_once(&lp_algalVerification_Algal_Expr_mergeLoop___closed__1, &lp_algalVerification_Algal_Expr_mergeLoop___closed__1_once, _init_lp_algalVerification_Algal_Expr_mergeLoop___closed__1);
v___x_786_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_786_, 0, v___x_785_);
return v___x_786_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_mergeLoop(lean_object* v_op_787_, lean_object* v_args_788_, lean_object* v_acc_789_, lean_object* v_i_790_){
_start:
{
if (lean_obj_tag(v_args_788_) == 0)
{
lean_object* v___x_791_; lean_object* v___x_792_; lean_object* v___x_793_; 
lean_dec(v_i_790_);
lean_dec_ref(v_op_787_);
v___x_791_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_791_, 0, v_acc_789_);
v___x_792_ = lean_box(0);
v___x_793_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_793_, 0, v___x_791_);
lean_ctor_set(v___x_793_, 1, v___x_792_);
return v___x_793_;
}
else
{
lean_object* v_value_794_; 
v_value_794_ = lean_ctor_get(v_args_788_, 0);
lean_inc(v_value_794_);
if (lean_obj_tag(v_value_794_) == 5)
{
lean_object* v_rest_795_; lean_object* v___x_797_; uint8_t v_isShared_798_; uint8_t v_isSharedCheck_831_; 
v_rest_795_ = lean_ctor_get(v_args_788_, 1);
v_isSharedCheck_831_ = !lean_is_exclusive(v_args_788_);
if (v_isSharedCheck_831_ == 0)
{
lean_object* v_unused_832_; 
v_unused_832_ = lean_ctor_get(v_args_788_, 0);
lean_dec(v_unused_832_);
v___x_797_ = v_args_788_;
v_isShared_798_ = v_isSharedCheck_831_;
goto v_resetjp_796_;
}
else
{
lean_inc(v_rest_795_);
lean_dec(v_args_788_);
v___x_797_ = lean_box(0);
v_isShared_798_ = v_isSharedCheck_831_;
goto v_resetjp_796_;
}
v_resetjp_796_:
{
lean_object* v_fields_799_; lean_object* v___x_800_; lean_object* v___x_801_; lean_object* v___x_802_; lean_object* v_merged_803_; lean_object* v_c_804_; lean_object* v___x_805_; lean_object* v___x_806_; lean_object* v___x_807_; lean_object* v___x_808_; uint8_t v___x_809_; 
v_fields_799_ = lean_ctor_get(v_value_794_, 0);
lean_inc(v_fields_799_);
lean_dec_ref_known(v_value_794_, 1);
v___x_800_ = lp_algalVerification_Algal_Core_Normalize_fieldsToList(v_acc_789_);
lean_dec(v_acc_789_);
v___x_801_ = lp_algalVerification_Algal_Core_Normalize_fieldsToList(v_fields_799_);
v___x_802_ = l_List_appendTR___redArg(v___x_800_, v___x_801_);
v_merged_803_ = lp_algalVerification_Algal_Core_Normalize_fieldsOfList(v___x_802_);
lean_dec(v___x_802_);
v_c_804_ = lp_algalVerification_Algal_Expr_fieldsLength(v_fields_799_);
lean_dec(v_fields_799_);
v___x_805_ = lean_unsigned_to_nat(256u);
v___x_806_ = lp_algalVerification_Algal_Expr_fieldNames(v_merged_803_);
v___x_807_ = lp_algalVerification_List_eraseDups___at___00Algal_Core_KeyOrder_support_spec__1(v___x_806_);
v___x_808_ = l_List_lengthTR___redArg(v___x_807_);
lean_dec(v___x_807_);
v___x_809_ = lean_nat_dec_lt(v___x_805_, v___x_808_);
lean_dec(v___x_808_);
if (v___x_809_ == 0)
{
lean_object* v___x_810_; lean_object* v___x_811_; lean_object* v___x_812_; lean_object* v_fst_813_; lean_object* v_snd_814_; lean_object* v___x_816_; uint8_t v_isShared_817_; uint8_t v_isSharedCheck_824_; 
v___x_810_ = lean_unsigned_to_nat(1u);
v___x_811_ = lean_nat_add(v_i_790_, v___x_810_);
lean_dec(v_i_790_);
v___x_812_ = lp_algalVerification_Algal_Expr_mergeLoop(v_op_787_, v_rest_795_, v_merged_803_, v___x_811_);
v_fst_813_ = lean_ctor_get(v___x_812_, 0);
v_snd_814_ = lean_ctor_get(v___x_812_, 1);
v_isSharedCheck_824_ = !lean_is_exclusive(v___x_812_);
if (v_isSharedCheck_824_ == 0)
{
v___x_816_ = v___x_812_;
v_isShared_817_ = v_isSharedCheck_824_;
goto v_resetjp_815_;
}
else
{
lean_inc(v_snd_814_);
lean_inc(v_fst_813_);
lean_dec(v___x_812_);
v___x_816_ = lean_box(0);
v_isShared_817_ = v_isSharedCheck_824_;
goto v_resetjp_815_;
}
v_resetjp_815_:
{
lean_object* v___x_819_; 
if (v_isShared_798_ == 0)
{
lean_ctor_set(v___x_797_, 1, v_snd_814_);
lean_ctor_set(v___x_797_, 0, v_c_804_);
v___x_819_ = v___x_797_;
goto v_reusejp_818_;
}
else
{
lean_object* v_reuseFailAlloc_823_; 
v_reuseFailAlloc_823_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_823_, 0, v_c_804_);
lean_ctor_set(v_reuseFailAlloc_823_, 1, v_snd_814_);
v___x_819_ = v_reuseFailAlloc_823_;
goto v_reusejp_818_;
}
v_reusejp_818_:
{
lean_object* v___x_821_; 
if (v_isShared_817_ == 0)
{
lean_ctor_set(v___x_816_, 1, v___x_819_);
v___x_821_ = v___x_816_;
goto v_reusejp_820_;
}
else
{
lean_object* v_reuseFailAlloc_822_; 
v_reuseFailAlloc_822_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_822_, 0, v_fst_813_);
lean_ctor_set(v_reuseFailAlloc_822_, 1, v___x_819_);
v___x_821_ = v_reuseFailAlloc_822_;
goto v_reusejp_820_;
}
v_reusejp_820_:
{
return v___x_821_;
}
}
}
}
else
{
lean_object* v___x_825_; lean_object* v___x_826_; lean_object* v___x_828_; 
lean_dec(v_merged_803_);
lean_dec(v_rest_795_);
lean_dec(v_i_790_);
lean_dec_ref(v_op_787_);
v___x_825_ = lean_obj_once(&lp_algalVerification_Algal_Expr_mergeLoop___closed__2, &lp_algalVerification_Algal_Expr_mergeLoop___closed__2_once, _init_lp_algalVerification_Algal_Expr_mergeLoop___closed__2);
v___x_826_ = lean_box(0);
if (v_isShared_798_ == 0)
{
lean_ctor_set(v___x_797_, 1, v___x_826_);
lean_ctor_set(v___x_797_, 0, v_c_804_);
v___x_828_ = v___x_797_;
goto v_reusejp_827_;
}
else
{
lean_object* v_reuseFailAlloc_830_; 
v_reuseFailAlloc_830_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_830_, 0, v_c_804_);
lean_ctor_set(v_reuseFailAlloc_830_, 1, v___x_826_);
v___x_828_ = v_reuseFailAlloc_830_;
goto v_reusejp_827_;
}
v_reusejp_827_:
{
lean_object* v___x_829_; 
v___x_829_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_829_, 0, v___x_825_);
lean_ctor_set(v___x_829_, 1, v___x_828_);
return v___x_829_;
}
}
}
}
else
{
lean_object* v___x_834_; uint8_t v_isShared_835_; uint8_t v_isSharedCheck_844_; 
lean_dec(v_acc_789_);
v_isSharedCheck_844_ = !lean_is_exclusive(v_args_788_);
if (v_isSharedCheck_844_ == 0)
{
lean_object* v_unused_845_; lean_object* v_unused_846_; 
v_unused_845_ = lean_ctor_get(v_args_788_, 1);
lean_dec(v_unused_845_);
v_unused_846_ = lean_ctor_get(v_args_788_, 0);
lean_dec(v_unused_846_);
v___x_834_ = v_args_788_;
v_isShared_835_ = v_isSharedCheck_844_;
goto v_resetjp_833_;
}
else
{
lean_dec(v_args_788_);
v___x_834_ = lean_box(0);
v_isShared_835_ = v_isSharedCheck_844_;
goto v_resetjp_833_;
}
v_resetjp_833_:
{
lean_object* v___x_836_; lean_object* v___x_837_; lean_object* v___x_838_; lean_object* v___x_839_; lean_object* v___x_840_; lean_object* v___x_842_; 
v___x_836_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asMap___closed__0));
v___x_837_ = lp_algalVerification_Algal_Expr_kindOf(v_value_794_);
lean_dec(v_value_794_);
v___x_838_ = lp_algalVerification_Algal_Expr_errType(v_op_787_, v_i_790_, v___x_836_, v___x_837_);
v___x_839_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_839_, 0, v___x_838_);
v___x_840_ = lean_box(0);
if (v_isShared_835_ == 0)
{
lean_ctor_set_tag(v___x_834_, 0);
lean_ctor_set(v___x_834_, 1, v___x_840_);
lean_ctor_set(v___x_834_, 0, v___x_839_);
v___x_842_ = v___x_834_;
goto v_reusejp_841_;
}
else
{
lean_object* v_reuseFailAlloc_843_; 
v_reuseFailAlloc_843_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_843_, 0, v___x_839_);
lean_ctor_set(v_reuseFailAlloc_843_, 1, v___x_840_);
v___x_842_ = v_reuseFailAlloc_843_;
goto v_reusejp_841_;
}
v_reusejp_841_:
{
return v___x_842_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_ctorIdx(lean_object* v_x_847_){
_start:
{
switch(lean_obj_tag(v_x_847_))
{
case 0:
{
lean_object* v___x_848_; 
v___x_848_ = lean_unsigned_to_nat(0u);
return v___x_848_;
}
case 1:
{
lean_object* v___x_849_; 
v___x_849_ = lean_unsigned_to_nat(1u);
return v___x_849_;
}
case 2:
{
lean_object* v___x_850_; 
v___x_850_ = lean_unsigned_to_nat(2u);
return v___x_850_;
}
case 3:
{
lean_object* v___x_851_; 
v___x_851_ = lean_unsigned_to_nat(3u);
return v___x_851_;
}
case 4:
{
lean_object* v___x_852_; 
v___x_852_ = lean_unsigned_to_nat(4u);
return v___x_852_;
}
case 5:
{
lean_object* v___x_853_; 
v___x_853_ = lean_unsigned_to_nat(5u);
return v___x_853_;
}
default: 
{
lean_object* v___x_854_; 
v___x_854_ = lean_unsigned_to_nat(6u);
return v___x_854_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_ctorIdx___boxed(lean_object* v_x_855_){
_start:
{
lean_object* v_res_856_; 
v_res_856_ = lp_algalVerification_Algal_Expr_Work_ctorIdx(v_x_855_);
lean_dec_ref(v_x_855_);
return v_res_856_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_ctorElim___redArg(lean_object* v_t_857_, lean_object* v_k_858_){
_start:
{
switch(lean_obj_tag(v_t_857_))
{
case 0:
{
lean_object* v_v_859_; lean_object* v___x_860_; 
v_v_859_ = lean_ctor_get(v_t_857_, 0);
lean_inc(v_v_859_);
lean_dec_ref_known(v_t_857_, 1);
v___x_860_ = lean_apply_1(v_k_858_, v_v_859_);
return v___x_860_;
}
case 3:
{
uint8_t v_want_861_; lean_object* v_op_862_; lean_object* v_pending_863_; lean_object* v_idx_864_; lean_object* v___x_865_; lean_object* v___x_866_; 
v_want_861_ = lean_ctor_get_uint8(v_t_857_, sizeof(void*)*3);
v_op_862_ = lean_ctor_get(v_t_857_, 0);
lean_inc_ref(v_op_862_);
v_pending_863_ = lean_ctor_get(v_t_857_, 1);
lean_inc(v_pending_863_);
v_idx_864_ = lean_ctor_get(v_t_857_, 2);
lean_inc(v_idx_864_);
lean_dec_ref_known(v_t_857_, 3);
v___x_865_ = lean_box(v_want_861_);
v___x_866_ = lean_apply_4(v_k_858_, v___x_865_, v_op_862_, v_pending_863_, v_idx_864_);
return v___x_866_;
}
case 4:
{
lean_object* v_op_867_; lean_object* v_cur_868_; lean_object* v_pending_869_; lean_object* v_step_870_; lean_object* v___x_871_; 
v_op_867_ = lean_ctor_get(v_t_857_, 0);
lean_inc_ref(v_op_867_);
v_cur_868_ = lean_ctor_get(v_t_857_, 1);
lean_inc(v_cur_868_);
v_pending_869_ = lean_ctor_get(v_t_857_, 2);
lean_inc(v_pending_869_);
v_step_870_ = lean_ctor_get(v_t_857_, 3);
lean_inc(v_step_870_);
lean_dec_ref_known(v_t_857_, 4);
v___x_871_ = lean_apply_4(v_k_858_, v_op_867_, v_cur_868_, v_pending_869_, v_step_870_);
return v___x_871_;
}
case 5:
{
uint8_t v_isMap_872_; lean_object* v_op_873_; lean_object* v_name_874_; lean_object* v_body_875_; lean_object* v_pending_876_; lean_object* v_acc_877_; lean_object* v_bytes_878_; lean_object* v_idx_879_; lean_object* v___x_880_; lean_object* v___x_881_; 
v_isMap_872_ = lean_ctor_get_uint8(v_t_857_, sizeof(void*)*7);
v_op_873_ = lean_ctor_get(v_t_857_, 0);
lean_inc_ref(v_op_873_);
v_name_874_ = lean_ctor_get(v_t_857_, 1);
lean_inc_ref(v_name_874_);
v_body_875_ = lean_ctor_get(v_t_857_, 2);
lean_inc(v_body_875_);
v_pending_876_ = lean_ctor_get(v_t_857_, 3);
lean_inc(v_pending_876_);
v_acc_877_ = lean_ctor_get(v_t_857_, 4);
lean_inc(v_acc_877_);
v_bytes_878_ = lean_ctor_get(v_t_857_, 5);
lean_inc(v_bytes_878_);
v_idx_879_ = lean_ctor_get(v_t_857_, 6);
lean_inc(v_idx_879_);
lean_dec_ref_known(v_t_857_, 7);
v___x_880_ = lean_box(v_isMap_872_);
v___x_881_ = lean_apply_8(v_k_858_, v___x_880_, v_op_873_, v_name_874_, v_body_875_, v_pending_876_, v_acc_877_, v_bytes_878_, v_idx_879_);
return v___x_881_;
}
case 6:
{
lean_object* v_accName_882_; lean_object* v_itemName_883_; lean_object* v_body_884_; lean_object* v_acc_885_; lean_object* v_pending_886_; lean_object* v___x_887_; 
v_accName_882_ = lean_ctor_get(v_t_857_, 0);
lean_inc_ref(v_accName_882_);
v_itemName_883_ = lean_ctor_get(v_t_857_, 1);
lean_inc_ref(v_itemName_883_);
v_body_884_ = lean_ctor_get(v_t_857_, 2);
lean_inc(v_body_884_);
v_acc_885_ = lean_ctor_get(v_t_857_, 3);
lean_inc(v_acc_885_);
v_pending_886_ = lean_ctor_get(v_t_857_, 4);
lean_inc(v_pending_886_);
lean_dec_ref_known(v_t_857_, 5);
v___x_887_ = lean_apply_5(v_k_858_, v_accName_882_, v_itemName_883_, v_body_884_, v_acc_885_, v_pending_886_);
return v___x_887_;
}
default: 
{
lean_object* v_pending_888_; lean_object* v_acc_889_; lean_object* v_bytes_890_; lean_object* v___x_891_; 
v_pending_888_ = lean_ctor_get(v_t_857_, 0);
lean_inc(v_pending_888_);
v_acc_889_ = lean_ctor_get(v_t_857_, 1);
lean_inc(v_acc_889_);
v_bytes_890_ = lean_ctor_get(v_t_857_, 2);
lean_inc(v_bytes_890_);
lean_dec_ref(v_t_857_);
v___x_891_ = lean_apply_3(v_k_858_, v_pending_888_, v_acc_889_, v_bytes_890_);
return v___x_891_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_ctorElim(lean_object* v_motive_892_, lean_object* v_ctorIdx_893_, lean_object* v_t_894_, lean_object* v_h_895_, lean_object* v_k_896_){
_start:
{
lean_object* v___x_897_; 
v___x_897_ = lp_algalVerification_Algal_Expr_Work_ctorElim___redArg(v_t_894_, v_k_896_);
return v___x_897_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_ctorElim___boxed(lean_object* v_motive_898_, lean_object* v_ctorIdx_899_, lean_object* v_t_900_, lean_object* v_h_901_, lean_object* v_k_902_){
_start:
{
lean_object* v_res_903_; 
v_res_903_ = lp_algalVerification_Algal_Expr_Work_ctorElim(v_motive_898_, v_ctorIdx_899_, v_t_900_, v_h_901_, v_k_902_);
lean_dec(v_ctorIdx_899_);
return v_res_903_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_node_elim___redArg(lean_object* v_t_904_, lean_object* v_node_905_){
_start:
{
lean_object* v___x_906_; 
v___x_906_ = lp_algalVerification_Algal_Expr_Work_ctorElim___redArg(v_t_904_, v_node_905_);
return v___x_906_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_node_elim(lean_object* v_motive_907_, lean_object* v_t_908_, lean_object* v_h_909_, lean_object* v_node_910_){
_start:
{
lean_object* v___x_911_; 
v___x_911_ = lp_algalVerification_Algal_Expr_Work_ctorElim___redArg(v_t_908_, v_node_910_);
return v___x_911_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_args_elim___redArg(lean_object* v_t_912_, lean_object* v_args_913_){
_start:
{
lean_object* v___x_914_; 
v___x_914_ = lp_algalVerification_Algal_Expr_Work_ctorElim___redArg(v_t_912_, v_args_913_);
return v___x_914_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_args_elim(lean_object* v_motive_915_, lean_object* v_t_916_, lean_object* v_h_917_, lean_object* v_args_918_){
_start:
{
lean_object* v___x_919_; 
v___x_919_ = lp_algalVerification_Algal_Expr_Work_ctorElim___redArg(v_t_916_, v_args_918_);
return v___x_919_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_objFields_elim___redArg(lean_object* v_t_920_, lean_object* v_objFields_921_){
_start:
{
lean_object* v___x_922_; 
v___x_922_ = lp_algalVerification_Algal_Expr_Work_ctorElim___redArg(v_t_920_, v_objFields_921_);
return v___x_922_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_objFields_elim(lean_object* v_motive_923_, lean_object* v_t_924_, lean_object* v_h_925_, lean_object* v_objFields_926_){
_start:
{
lean_object* v___x_927_; 
v___x_927_ = lp_algalVerification_Algal_Expr_Work_ctorElim___redArg(v_t_924_, v_objFields_926_);
return v___x_927_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_bools_elim___redArg(lean_object* v_t_928_, lean_object* v_bools_929_){
_start:
{
lean_object* v___x_930_; 
v___x_930_ = lp_algalVerification_Algal_Expr_Work_ctorElim___redArg(v_t_928_, v_bools_929_);
return v___x_930_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_bools_elim(lean_object* v_motive_931_, lean_object* v_t_932_, lean_object* v_h_933_, lean_object* v_bools_934_){
_start:
{
lean_object* v___x_935_; 
v___x_935_ = lp_algalVerification_Algal_Expr_Work_ctorElim___redArg(v_t_932_, v_bools_934_);
return v___x_935_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_getPath_elim___redArg(lean_object* v_t_936_, lean_object* v_getPath_937_){
_start:
{
lean_object* v___x_938_; 
v___x_938_ = lp_algalVerification_Algal_Expr_Work_ctorElim___redArg(v_t_936_, v_getPath_937_);
return v___x_938_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_getPath_elim(lean_object* v_motive_939_, lean_object* v_t_940_, lean_object* v_h_941_, lean_object* v_getPath_942_){
_start:
{
lean_object* v___x_943_; 
v___x_943_ = lp_algalVerification_Algal_Expr_Work_ctorElim___redArg(v_t_940_, v_getPath_942_);
return v___x_943_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_mapFilt_elim___redArg(lean_object* v_t_944_, lean_object* v_mapFilt_945_){
_start:
{
lean_object* v___x_946_; 
v___x_946_ = lp_algalVerification_Algal_Expr_Work_ctorElim___redArg(v_t_944_, v_mapFilt_945_);
return v___x_946_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_mapFilt_elim(lean_object* v_motive_947_, lean_object* v_t_948_, lean_object* v_h_949_, lean_object* v_mapFilt_950_){
_start:
{
lean_object* v___x_951_; 
v___x_951_ = lp_algalVerification_Algal_Expr_Work_ctorElim___redArg(v_t_948_, v_mapFilt_950_);
return v___x_951_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_fold_elim___redArg(lean_object* v_t_952_, lean_object* v_fold_953_){
_start:
{
lean_object* v___x_954_; 
v___x_954_ = lp_algalVerification_Algal_Expr_Work_ctorElim___redArg(v_t_952_, v_fold_953_);
return v___x_954_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_Work_fold_elim(lean_object* v_motive_955_, lean_object* v_t_956_, lean_object* v_h_957_, lean_object* v_fold_958_){
_start:
{
lean_object* v___x_959_; 
v___x_959_ = lp_algalVerification_Algal_Expr_Work_ctorElim___redArg(v_t_956_, v_fold_958_);
return v___x_959_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_instDecidableEqWork_decEq(lean_object* v_x_960_, lean_object* v_x_961_){
_start:
{
switch(lean_obj_tag(v_x_960_))
{
case 0:
{
if (lean_obj_tag(v_x_961_) == 0)
{
lean_object* v_v_962_; lean_object* v_v_963_; uint8_t v___x_964_; 
v_v_962_ = lean_ctor_get(v_x_960_, 0);
v_v_963_ = lean_ctor_get(v_x_961_, 0);
v___x_964_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_v_962_, v_v_963_);
return v___x_964_;
}
else
{
uint8_t v___x_965_; 
v___x_965_ = 0;
return v___x_965_;
}
}
case 1:
{
if (lean_obj_tag(v_x_961_) == 1)
{
lean_object* v_pending_966_; lean_object* v_acc_967_; lean_object* v_bytes_968_; lean_object* v_pending_969_; lean_object* v_acc_970_; lean_object* v_bytes_971_; uint8_t v___x_972_; 
v_pending_966_ = lean_ctor_get(v_x_960_, 0);
v_acc_967_ = lean_ctor_get(v_x_960_, 1);
v_bytes_968_ = lean_ctor_get(v_x_960_, 2);
v_pending_969_ = lean_ctor_get(v_x_961_, 0);
v_acc_970_ = lean_ctor_get(v_x_961_, 1);
v_bytes_971_ = lean_ctor_get(v_x_961_, 2);
v___x_972_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__2(v_pending_966_, v_pending_969_);
if (v___x_972_ == 0)
{
return v___x_972_;
}
else
{
uint8_t v___x_973_; 
v___x_973_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__2(v_acc_967_, v_acc_970_);
if (v___x_973_ == 0)
{
return v___x_973_;
}
else
{
uint8_t v___x_974_; 
v___x_974_ = lean_nat_dec_eq(v_bytes_968_, v_bytes_971_);
return v___x_974_;
}
}
}
else
{
uint8_t v___x_975_; 
v___x_975_ = 0;
return v___x_975_;
}
}
case 2:
{
if (lean_obj_tag(v_x_961_) == 2)
{
lean_object* v_pending_976_; lean_object* v_acc_977_; lean_object* v_bytes_978_; lean_object* v_pending_979_; lean_object* v_acc_980_; lean_object* v_bytes_981_; uint8_t v___x_982_; 
v_pending_976_ = lean_ctor_get(v_x_960_, 0);
v_acc_977_ = lean_ctor_get(v_x_960_, 1);
v_bytes_978_ = lean_ctor_get(v_x_960_, 2);
v_pending_979_ = lean_ctor_get(v_x_961_, 0);
v_acc_980_ = lean_ctor_get(v_x_961_, 1);
v_bytes_981_ = lean_ctor_get(v_x_961_, 2);
v___x_982_ = lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__3(v_pending_976_, v_pending_979_);
if (v___x_982_ == 0)
{
return v___x_982_;
}
else
{
uint8_t v___x_983_; 
v___x_983_ = lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__3(v_acc_977_, v_acc_980_);
if (v___x_983_ == 0)
{
return v___x_983_;
}
else
{
uint8_t v___x_984_; 
v___x_984_ = lean_nat_dec_eq(v_bytes_978_, v_bytes_981_);
return v___x_984_;
}
}
}
else
{
uint8_t v___x_985_; 
v___x_985_ = 0;
return v___x_985_;
}
}
case 3:
{
if (lean_obj_tag(v_x_961_) == 3)
{
uint8_t v_want_986_; lean_object* v_op_987_; lean_object* v_pending_988_; lean_object* v_idx_989_; uint8_t v_want_990_; lean_object* v_op_991_; lean_object* v_pending_992_; lean_object* v_idx_993_; 
v_want_986_ = lean_ctor_get_uint8(v_x_960_, sizeof(void*)*3);
v_op_987_ = lean_ctor_get(v_x_960_, 0);
v_pending_988_ = lean_ctor_get(v_x_960_, 1);
v_idx_989_ = lean_ctor_get(v_x_960_, 2);
v_want_990_ = lean_ctor_get_uint8(v_x_961_, sizeof(void*)*3);
v_op_991_ = lean_ctor_get(v_x_961_, 0);
v_pending_992_ = lean_ctor_get(v_x_961_, 1);
v_idx_993_ = lean_ctor_get(v_x_961_, 2);
if (v_want_986_ == 0)
{
if (v_want_990_ == 0)
{
goto v___jp_994_;
}
else
{
return v_want_986_;
}
}
else
{
if (v_want_990_ == 0)
{
return v_want_990_;
}
else
{
goto v___jp_994_;
}
}
v___jp_994_:
{
uint8_t v___x_995_; 
v___x_995_ = lean_string_dec_eq(v_op_987_, v_op_991_);
if (v___x_995_ == 0)
{
return v___x_995_;
}
else
{
uint8_t v___x_996_; 
v___x_996_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__2(v_pending_988_, v_pending_992_);
if (v___x_996_ == 0)
{
return v___x_996_;
}
else
{
uint8_t v___x_997_; 
v___x_997_ = lean_nat_dec_eq(v_idx_989_, v_idx_993_);
return v___x_997_;
}
}
}
}
else
{
uint8_t v___x_998_; 
v___x_998_ = 0;
return v___x_998_;
}
}
case 4:
{
if (lean_obj_tag(v_x_961_) == 4)
{
lean_object* v_op_999_; lean_object* v_cur_1000_; lean_object* v_pending_1001_; lean_object* v_step_1002_; lean_object* v_op_1003_; lean_object* v_cur_1004_; lean_object* v_pending_1005_; lean_object* v_step_1006_; uint8_t v___x_1007_; 
v_op_999_ = lean_ctor_get(v_x_960_, 0);
v_cur_1000_ = lean_ctor_get(v_x_960_, 1);
v_pending_1001_ = lean_ctor_get(v_x_960_, 2);
v_step_1002_ = lean_ctor_get(v_x_960_, 3);
v_op_1003_ = lean_ctor_get(v_x_961_, 0);
v_cur_1004_ = lean_ctor_get(v_x_961_, 1);
v_pending_1005_ = lean_ctor_get(v_x_961_, 2);
v_step_1006_ = lean_ctor_get(v_x_961_, 3);
v___x_1007_ = lean_string_dec_eq(v_op_999_, v_op_1003_);
if (v___x_1007_ == 0)
{
return v___x_1007_;
}
else
{
uint8_t v___x_1008_; 
v___x_1008_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_cur_1000_, v_cur_1004_);
if (v___x_1008_ == 0)
{
return v___x_1008_;
}
else
{
uint8_t v___x_1009_; 
v___x_1009_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__2(v_pending_1001_, v_pending_1005_);
if (v___x_1009_ == 0)
{
return v___x_1009_;
}
else
{
uint8_t v___x_1010_; 
v___x_1010_ = lean_nat_dec_eq(v_step_1002_, v_step_1006_);
return v___x_1010_;
}
}
}
}
else
{
uint8_t v___x_1011_; 
v___x_1011_ = 0;
return v___x_1011_;
}
}
case 5:
{
if (lean_obj_tag(v_x_961_) == 5)
{
uint8_t v_isMap_1012_; lean_object* v_op_1013_; lean_object* v_name_1014_; lean_object* v_body_1015_; lean_object* v_pending_1016_; lean_object* v_acc_1017_; lean_object* v_bytes_1018_; lean_object* v_idx_1019_; uint8_t v_isMap_1020_; lean_object* v_op_1021_; lean_object* v_name_1022_; lean_object* v_body_1023_; lean_object* v_pending_1024_; lean_object* v_acc_1025_; lean_object* v_bytes_1026_; lean_object* v_idx_1027_; 
v_isMap_1012_ = lean_ctor_get_uint8(v_x_960_, sizeof(void*)*7);
v_op_1013_ = lean_ctor_get(v_x_960_, 0);
v_name_1014_ = lean_ctor_get(v_x_960_, 1);
v_body_1015_ = lean_ctor_get(v_x_960_, 2);
v_pending_1016_ = lean_ctor_get(v_x_960_, 3);
v_acc_1017_ = lean_ctor_get(v_x_960_, 4);
v_bytes_1018_ = lean_ctor_get(v_x_960_, 5);
v_idx_1019_ = lean_ctor_get(v_x_960_, 6);
v_isMap_1020_ = lean_ctor_get_uint8(v_x_961_, sizeof(void*)*7);
v_op_1021_ = lean_ctor_get(v_x_961_, 0);
v_name_1022_ = lean_ctor_get(v_x_961_, 1);
v_body_1023_ = lean_ctor_get(v_x_961_, 2);
v_pending_1024_ = lean_ctor_get(v_x_961_, 3);
v_acc_1025_ = lean_ctor_get(v_x_961_, 4);
v_bytes_1026_ = lean_ctor_get(v_x_961_, 5);
v_idx_1027_ = lean_ctor_get(v_x_961_, 6);
if (v_isMap_1012_ == 0)
{
if (v_isMap_1020_ == 0)
{
goto v___jp_1028_;
}
else
{
return v_isMap_1012_;
}
}
else
{
if (v_isMap_1020_ == 0)
{
return v_isMap_1020_;
}
else
{
goto v___jp_1028_;
}
}
v___jp_1028_:
{
uint8_t v___x_1029_; 
v___x_1029_ = lean_string_dec_eq(v_op_1013_, v_op_1021_);
if (v___x_1029_ == 0)
{
return v___x_1029_;
}
else
{
uint8_t v___x_1030_; 
v___x_1030_ = lean_string_dec_eq(v_name_1014_, v_name_1022_);
if (v___x_1030_ == 0)
{
return v___x_1030_;
}
else
{
uint8_t v___x_1031_; 
v___x_1031_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_body_1015_, v_body_1023_);
if (v___x_1031_ == 0)
{
return v___x_1031_;
}
else
{
uint8_t v___x_1032_; 
v___x_1032_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__2(v_pending_1016_, v_pending_1024_);
if (v___x_1032_ == 0)
{
return v___x_1032_;
}
else
{
uint8_t v___x_1033_; 
v___x_1033_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__2(v_acc_1017_, v_acc_1025_);
if (v___x_1033_ == 0)
{
return v___x_1033_;
}
else
{
uint8_t v___x_1034_; 
v___x_1034_ = lean_nat_dec_eq(v_bytes_1018_, v_bytes_1026_);
if (v___x_1034_ == 0)
{
return v___x_1034_;
}
else
{
uint8_t v___x_1035_; 
v___x_1035_ = lean_nat_dec_eq(v_idx_1019_, v_idx_1027_);
return v___x_1035_;
}
}
}
}
}
}
}
}
else
{
uint8_t v___x_1036_; 
v___x_1036_ = 0;
return v___x_1036_;
}
}
default: 
{
if (lean_obj_tag(v_x_961_) == 6)
{
lean_object* v_accName_1037_; lean_object* v_itemName_1038_; lean_object* v_body_1039_; lean_object* v_acc_1040_; lean_object* v_pending_1041_; lean_object* v_accName_1042_; lean_object* v_itemName_1043_; lean_object* v_body_1044_; lean_object* v_acc_1045_; lean_object* v_pending_1046_; uint8_t v___x_1047_; 
v_accName_1037_ = lean_ctor_get(v_x_960_, 0);
v_itemName_1038_ = lean_ctor_get(v_x_960_, 1);
v_body_1039_ = lean_ctor_get(v_x_960_, 2);
v_acc_1040_ = lean_ctor_get(v_x_960_, 3);
v_pending_1041_ = lean_ctor_get(v_x_960_, 4);
v_accName_1042_ = lean_ctor_get(v_x_961_, 0);
v_itemName_1043_ = lean_ctor_get(v_x_961_, 1);
v_body_1044_ = lean_ctor_get(v_x_961_, 2);
v_acc_1045_ = lean_ctor_get(v_x_961_, 3);
v_pending_1046_ = lean_ctor_get(v_x_961_, 4);
v___x_1047_ = lean_string_dec_eq(v_accName_1037_, v_accName_1042_);
if (v___x_1047_ == 0)
{
return v___x_1047_;
}
else
{
uint8_t v___x_1048_; 
v___x_1048_ = lean_string_dec_eq(v_itemName_1038_, v_itemName_1043_);
if (v___x_1048_ == 0)
{
return v___x_1048_;
}
else
{
uint8_t v___x_1049_; 
v___x_1049_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_body_1039_, v_body_1044_);
if (v___x_1049_ == 0)
{
return v___x_1049_;
}
else
{
uint8_t v___x_1050_; 
v___x_1050_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_acc_1040_, v_acc_1045_);
if (v___x_1050_ == 0)
{
return v___x_1050_;
}
else
{
uint8_t v___x_1051_; 
v___x_1051_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__2(v_pending_1041_, v_pending_1046_);
return v___x_1051_;
}
}
}
}
}
else
{
uint8_t v___x_1052_; 
v___x_1052_ = 0;
return v___x_1052_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instDecidableEqWork_decEq___boxed(lean_object* v_x_1053_, lean_object* v_x_1054_){
_start:
{
uint8_t v_res_1055_; lean_object* v_r_1056_; 
v_res_1055_ = lp_algalVerification_Algal_Expr_instDecidableEqWork_decEq(v_x_1053_, v_x_1054_);
lean_dec_ref(v_x_1054_);
lean_dec_ref(v_x_1053_);
v_r_1056_ = lean_box(v_res_1055_);
return v_r_1056_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_instDecidableEqWork(lean_object* v_x_1057_, lean_object* v_x_1058_){
_start:
{
uint8_t v___x_1059_; 
v___x_1059_ = lp_algalVerification_Algal_Expr_instDecidableEqWork_decEq(v_x_1057_, v_x_1058_);
return v___x_1059_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instDecidableEqWork___boxed(lean_object* v_x_1060_, lean_object* v_x_1061_){
_start:
{
uint8_t v_res_1062_; lean_object* v_r_1063_; 
v_res_1062_ = lp_algalVerification_Algal_Expr_instDecidableEqWork(v_x_1060_, v_x_1061_);
lean_dec_ref(v_x_1061_);
lean_dec_ref(v_x_1060_);
v_r_1063_ = lean_box(v_res_1062_);
return v_r_1063_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsMeasure(lean_object* v_x_1064_){
_start:
{
if (lean_obj_tag(v_x_1064_) == 0)
{
lean_object* v___x_1065_; 
v___x_1065_ = lean_unsigned_to_nat(1u);
return v___x_1065_;
}
else
{
lean_object* v_value_1066_; lean_object* v_rest_1067_; lean_object* v___x_1068_; lean_object* v___x_1069_; lean_object* v___x_1070_; lean_object* v___x_1071_; lean_object* v___x_1072_; 
v_value_1066_ = lean_ctor_get(v_x_1064_, 0);
v_rest_1067_ = lean_ctor_get(v_x_1064_, 1);
v___x_1068_ = lean_unsigned_to_nat(1u);
v___x_1069_ = lp_algalVerification_Algal_Expr_valueMeasure(v_value_1066_);
v___x_1070_ = lean_nat_add(v___x_1068_, v___x_1069_);
lean_dec(v___x_1069_);
v___x_1071_ = lp_algalVerification_Algal_Expr_itemsMeasure(v_rest_1067_);
v___x_1072_ = lean_nat_add(v___x_1070_, v___x_1071_);
lean_dec(v___x_1071_);
lean_dec(v___x_1070_);
return v___x_1072_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_valueMeasure(lean_object* v_x_1073_){
_start:
{
switch(lean_obj_tag(v_x_1073_))
{
case 0:
{
lean_object* v___x_1074_; 
v___x_1074_ = lean_unsigned_to_nat(1u);
return v___x_1074_;
}
case 4:
{
lean_object* v_values_1075_; lean_object* v___x_1076_; lean_object* v___x_1077_; lean_object* v___x_1078_; 
v_values_1075_ = lean_ctor_get(v_x_1073_, 0);
v___x_1076_ = lean_unsigned_to_nat(1u);
v___x_1077_ = lp_algalVerification_Algal_Expr_itemsMeasure(v_values_1075_);
v___x_1078_ = lean_nat_add(v___x_1076_, v___x_1077_);
lean_dec(v___x_1077_);
return v___x_1078_;
}
case 5:
{
lean_object* v_fields_1079_; lean_object* v___x_1080_; lean_object* v___x_1081_; lean_object* v___x_1082_; 
v_fields_1079_ = lean_ctor_get(v_x_1073_, 0);
v___x_1080_ = lean_unsigned_to_nat(1u);
v___x_1081_ = lp_algalVerification_Algal_Expr_fieldsMeasure(v_fields_1079_);
v___x_1082_ = lean_nat_add(v___x_1080_, v___x_1081_);
lean_dec(v___x_1081_);
return v___x_1082_;
}
default: 
{
lean_object* v___x_1083_; 
v___x_1083_ = lean_unsigned_to_nat(1u);
return v___x_1083_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsMeasure(lean_object* v_x_1084_){
_start:
{
if (lean_obj_tag(v_x_1084_) == 0)
{
lean_object* v___x_1085_; 
v___x_1085_ = lean_unsigned_to_nat(1u);
return v___x_1085_;
}
else
{
lean_object* v_value_1086_; lean_object* v_rest_1087_; lean_object* v___x_1088_; lean_object* v___x_1089_; lean_object* v___x_1090_; lean_object* v___x_1091_; lean_object* v___x_1092_; 
v_value_1086_ = lean_ctor_get(v_x_1084_, 1);
v_rest_1087_ = lean_ctor_get(v_x_1084_, 2);
v___x_1088_ = lean_unsigned_to_nat(1u);
v___x_1089_ = lp_algalVerification_Algal_Expr_valueMeasure(v_value_1086_);
v___x_1090_ = lean_nat_add(v___x_1088_, v___x_1089_);
lean_dec(v___x_1089_);
v___x_1091_ = lp_algalVerification_Algal_Expr_fieldsMeasure(v_rest_1087_);
v___x_1092_ = lean_nat_add(v___x_1090_, v___x_1091_);
lean_dec(v___x_1091_);
lean_dec(v___x_1090_);
return v___x_1092_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsMeasure___boxed(lean_object* v_x_1093_){
_start:
{
lean_object* v_res_1094_; 
v_res_1094_ = lp_algalVerification_Algal_Expr_fieldsMeasure(v_x_1093_);
lean_dec(v_x_1093_);
return v_res_1094_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsMeasure___boxed(lean_object* v_x_1095_){
_start:
{
lean_object* v_res_1096_; 
v_res_1096_ = lp_algalVerification_Algal_Expr_itemsMeasure(v_x_1095_);
lean_dec(v_x_1095_);
return v_res_1096_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_valueMeasure___boxed(lean_object* v_x_1097_){
_start:
{
lean_object* v_res_1098_; 
v_res_1098_ = lp_algalVerification_Algal_Expr_valueMeasure(v_x_1097_);
lean_dec(v_x_1097_);
return v_res_1098_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_workMeasure(lean_object* v_x_1099_){
_start:
{
switch(lean_obj_tag(v_x_1099_))
{
case 0:
{
lean_object* v_v_1100_; lean_object* v___x_1101_; lean_object* v___x_1102_; lean_object* v___x_1103_; 
v_v_1100_ = lean_ctor_get(v_x_1099_, 0);
v___x_1101_ = lp_algalVerification_Algal_Expr_valueMeasure(v_v_1100_);
v___x_1102_ = lean_unsigned_to_nat(0u);
v___x_1103_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1103_, 0, v___x_1101_);
lean_ctor_set(v___x_1103_, 1, v___x_1102_);
return v___x_1103_;
}
case 1:
{
lean_object* v_pending_1104_; lean_object* v___x_1105_; lean_object* v___x_1106_; lean_object* v___x_1107_; 
v_pending_1104_ = lean_ctor_get(v_x_1099_, 0);
v___x_1105_ = lp_algalVerification_Algal_Expr_itemsMeasure(v_pending_1104_);
v___x_1106_ = lean_unsigned_to_nat(0u);
v___x_1107_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1107_, 0, v___x_1105_);
lean_ctor_set(v___x_1107_, 1, v___x_1106_);
return v___x_1107_;
}
case 2:
{
lean_object* v_pending_1108_; lean_object* v___x_1109_; lean_object* v___x_1110_; lean_object* v___x_1111_; 
v_pending_1108_ = lean_ctor_get(v_x_1099_, 0);
v___x_1109_ = lp_algalVerification_Algal_Expr_fieldsMeasure(v_pending_1108_);
v___x_1110_ = lean_unsigned_to_nat(0u);
v___x_1111_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1111_, 0, v___x_1109_);
lean_ctor_set(v___x_1111_, 1, v___x_1110_);
return v___x_1111_;
}
case 3:
{
lean_object* v_pending_1112_; lean_object* v___x_1113_; lean_object* v___x_1114_; lean_object* v___x_1115_; 
v_pending_1112_ = lean_ctor_get(v_x_1099_, 1);
v___x_1113_ = lp_algalVerification_Algal_Expr_itemsMeasure(v_pending_1112_);
v___x_1114_ = lean_unsigned_to_nat(0u);
v___x_1115_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1115_, 0, v___x_1113_);
lean_ctor_set(v___x_1115_, 1, v___x_1114_);
return v___x_1115_;
}
case 4:
{
lean_object* v_pending_1116_; lean_object* v___x_1117_; lean_object* v___x_1118_; lean_object* v___x_1119_; 
v_pending_1116_ = lean_ctor_get(v_x_1099_, 2);
v___x_1117_ = lp_algalVerification_Algal_Expr_itemsMeasure(v_pending_1116_);
v___x_1118_ = lean_unsigned_to_nat(0u);
v___x_1119_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1119_, 0, v___x_1117_);
lean_ctor_set(v___x_1119_, 1, v___x_1118_);
return v___x_1119_;
}
case 5:
{
lean_object* v_body_1120_; lean_object* v_pending_1121_; lean_object* v___x_1122_; lean_object* v___x_1123_; lean_object* v___x_1124_; 
v_body_1120_ = lean_ctor_get(v_x_1099_, 2);
v_pending_1121_ = lean_ctor_get(v_x_1099_, 3);
v___x_1122_ = lp_algalVerification_Algal_Expr_valueMeasure(v_body_1120_);
v___x_1123_ = lp_algalVerification_Algal_Expr_itemsLength(v_pending_1121_);
v___x_1124_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1124_, 0, v___x_1122_);
lean_ctor_set(v___x_1124_, 1, v___x_1123_);
return v___x_1124_;
}
default: 
{
lean_object* v_body_1125_; lean_object* v_pending_1126_; lean_object* v___x_1127_; lean_object* v___x_1128_; lean_object* v___x_1129_; 
v_body_1125_ = lean_ctor_get(v_x_1099_, 2);
v_pending_1126_ = lean_ctor_get(v_x_1099_, 4);
v___x_1127_ = lp_algalVerification_Algal_Expr_valueMeasure(v_body_1125_);
v___x_1128_ = lp_algalVerification_Algal_Expr_itemsLength(v_pending_1126_);
v___x_1129_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1129_, 0, v___x_1127_);
lean_ctor_set(v___x_1129_, 1, v___x_1128_);
return v___x_1129_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_workMeasure___boxed(lean_object* v_x_1130_){
_start:
{
lean_object* v_res_1131_; 
v_res_1131_ = lp_algalVerification_Algal_Expr_workMeasure(v_x_1130_);
lean_dec_ref(v_x_1130_);
return v_res_1131_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_fieldsLength_match__1_splitter___redArg(lean_object* v_x_1132_, lean_object* v_h__1_1133_, lean_object* v_h__2_1134_){
_start:
{
if (lean_obj_tag(v_x_1132_) == 0)
{
lean_object* v___x_1135_; lean_object* v___x_1136_; 
lean_dec(v_h__2_1134_);
v___x_1135_ = lean_box(0);
v___x_1136_ = lean_apply_1(v_h__1_1133_, v___x_1135_);
return v___x_1136_;
}
else
{
lean_object* v_key_1137_; lean_object* v_value_1138_; lean_object* v_rest_1139_; lean_object* v___x_1140_; 
lean_dec(v_h__1_1133_);
v_key_1137_ = lean_ctor_get(v_x_1132_, 0);
lean_inc_ref(v_key_1137_);
v_value_1138_ = lean_ctor_get(v_x_1132_, 1);
lean_inc(v_value_1138_);
v_rest_1139_ = lean_ctor_get(v_x_1132_, 2);
lean_inc(v_rest_1139_);
lean_dec_ref_known(v_x_1132_, 3);
v___x_1140_ = lean_apply_3(v_h__2_1134_, v_key_1137_, v_value_1138_, v_rest_1139_);
return v___x_1140_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_fieldsLength_match__1_splitter(lean_object* v_motive_1141_, lean_object* v_x_1142_, lean_object* v_h__1_1143_, lean_object* v_h__2_1144_){
_start:
{
if (lean_obj_tag(v_x_1142_) == 0)
{
lean_object* v___x_1145_; lean_object* v___x_1146_; 
lean_dec(v_h__2_1144_);
v___x_1145_ = lean_box(0);
v___x_1146_ = lean_apply_1(v_h__1_1143_, v___x_1145_);
return v___x_1146_;
}
else
{
lean_object* v_key_1147_; lean_object* v_value_1148_; lean_object* v_rest_1149_; lean_object* v___x_1150_; 
lean_dec(v_h__1_1143_);
v_key_1147_ = lean_ctor_get(v_x_1142_, 0);
lean_inc_ref(v_key_1147_);
v_value_1148_ = lean_ctor_get(v_x_1142_, 1);
lean_inc(v_value_1148_);
v_rest_1149_ = lean_ctor_get(v_x_1142_, 2);
lean_inc(v_rest_1149_);
lean_dec_ref_known(v_x_1142_, 3);
v___x_1150_ = lean_apply_3(v_h__2_1144_, v_key_1147_, v_value_1148_, v_rest_1149_);
return v___x_1150_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_fieldsMeasure_match__1_splitter___redArg(lean_object* v_x_1151_, lean_object* v_h__1_1152_, lean_object* v_h__2_1153_){
_start:
{
if (lean_obj_tag(v_x_1151_) == 0)
{
lean_object* v___x_1154_; lean_object* v___x_1155_; 
lean_dec(v_h__2_1153_);
v___x_1154_ = lean_box(0);
v___x_1155_ = lean_apply_1(v_h__1_1152_, v___x_1154_);
return v___x_1155_;
}
else
{
lean_object* v_key_1156_; lean_object* v_value_1157_; lean_object* v_rest_1158_; lean_object* v___x_1159_; 
lean_dec(v_h__1_1152_);
v_key_1156_ = lean_ctor_get(v_x_1151_, 0);
lean_inc_ref(v_key_1156_);
v_value_1157_ = lean_ctor_get(v_x_1151_, 1);
lean_inc(v_value_1157_);
v_rest_1158_ = lean_ctor_get(v_x_1151_, 2);
lean_inc(v_rest_1158_);
lean_dec_ref_known(v_x_1151_, 3);
v___x_1159_ = lean_apply_3(v_h__2_1153_, v_key_1156_, v_value_1157_, v_rest_1158_);
return v___x_1159_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_fieldsMeasure_match__1_splitter(lean_object* v_motive_1160_, lean_object* v_x_1161_, lean_object* v_h__1_1162_, lean_object* v_h__2_1163_){
_start:
{
if (lean_obj_tag(v_x_1161_) == 0)
{
lean_object* v___x_1164_; lean_object* v___x_1165_; 
lean_dec(v_h__2_1163_);
v___x_1164_ = lean_box(0);
v___x_1165_ = lean_apply_1(v_h__1_1162_, v___x_1164_);
return v___x_1165_;
}
else
{
lean_object* v_key_1166_; lean_object* v_value_1167_; lean_object* v_rest_1168_; lean_object* v___x_1169_; 
lean_dec(v_h__1_1162_);
v_key_1166_ = lean_ctor_get(v_x_1161_, 0);
lean_inc_ref(v_key_1166_);
v_value_1167_ = lean_ctor_get(v_x_1161_, 1);
lean_inc(v_value_1167_);
v_rest_1168_ = lean_ctor_get(v_x_1161_, 2);
lean_inc(v_rest_1168_);
lean_dec_ref_known(v_x_1161_, 3);
v___x_1169_ = lean_apply_3(v_h__2_1163_, v_key_1166_, v_value_1167_, v_rest_1168_);
return v___x_1169_;
}
}
}
LEAN_EXPORT double lp_algalVerification_Algal_Expr_machine___lam__0(uint8_t v___x_1170_, double v___y_1171_, double v___y_1172_){
_start:
{
if (v___x_1170_ == 0)
{
double v___x_1173_; 
v___x_1173_ = lean_float_mul(v___y_1171_, v___y_1172_);
return v___x_1173_;
}
else
{
double v___x_1174_; 
v___x_1174_ = lean_float_add(v___y_1171_, v___y_1172_);
return v___x_1174_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__0___boxed(lean_object* v___x_1175_, lean_object* v___y_1176_, lean_object* v___y_1177_){
_start:
{
uint8_t v___x_25841__boxed_1178_; double v___y_25842__boxed_1179_; double v___y_25843__boxed_1180_; double v_res_1181_; lean_object* v_r_1182_; 
v___x_25841__boxed_1178_ = lean_unbox(v___x_1175_);
v___y_25842__boxed_1179_ = lean_unbox_float(v___y_1176_);
lean_dec_ref(v___y_1176_);
v___y_25843__boxed_1180_ = lean_unbox_float(v___y_1177_);
lean_dec_ref(v___y_1177_);
v_res_1181_ = lp_algalVerification_Algal_Expr_machine___lam__0(v___x_25841__boxed_1178_, v___y_25842__boxed_1179_, v___y_25843__boxed_1180_);
v_r_1182_ = lean_box_float(v_res_1181_);
return v_r_1182_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__7(lean_object* v_value_1185_, lean_object* v_value_1186_, lean_object* v_value_1187_, lean_object* v_x_1188_, lean_object* v_x_1189_){
_start:
{
lean_object* v___x_1190_; lean_object* v___x_1191_; lean_object* v___x_1192_; lean_object* v___x_1193_; lean_object* v___x_1194_; lean_object* v___x_1195_; lean_object* v___x_1196_; lean_object* v___x_1197_; lean_object* v___x_1198_; 
v___x_1190_ = lean_unsigned_to_nat(0u);
v___x_1191_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__7___closed__0));
v___x_1192_ = lp_algalVerification_Algal_Expr_kindOf(v_value_1185_);
v___x_1193_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__7___closed__1));
v___x_1194_ = lean_string_append(v___x_1192_, v___x_1193_);
v___x_1195_ = lp_algalVerification_Algal_Expr_kindOf(v_value_1186_);
v___x_1196_ = lean_string_append(v___x_1194_, v___x_1195_);
lean_dec_ref(v___x_1195_);
v___x_1197_ = lp_algalVerification_Algal_Expr_errType(v_value_1187_, v___x_1190_, v___x_1191_, v___x_1196_);
v___x_1198_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_1197_);
return v___x_1198_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__7___boxed(lean_object* v_value_1199_, lean_object* v_value_1200_, lean_object* v_value_1201_, lean_object* v_x_1202_, lean_object* v_x_1203_){
_start:
{
lean_object* v_res_1204_; 
v_res_1204_ = lp_algalVerification_Algal_Expr_machine___lam__7(v_value_1199_, v_value_1200_, v_value_1201_, v_x_1202_, v_x_1203_);
lean_dec(v_x_1203_);
lean_dec(v_x_1202_);
lean_dec(v_value_1200_);
lean_dec(v_value_1199_);
return v_res_1204_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_machine___lam__6___closed__0(void){
_start:
{
lean_object* v___x_1205_; lean_object* v___x_1206_; 
v___x_1205_ = lean_obj_once(&lp_algalVerification_Algal_Expr_minMaxFold___closed__0, &lp_algalVerification_Algal_Expr_minMaxFold___closed__0_once, _init_lp_algalVerification_Algal_Expr_minMaxFold___closed__0);
v___x_1206_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_1205_);
return v___x_1206_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__6(lean_object* v_x_1207_){
_start:
{
lean_object* v___x_1208_; 
v___x_1208_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__6___closed__0, &lp_algalVerification_Algal_Expr_machine___lam__6___closed__0_once, _init_lp_algalVerification_Algal_Expr_machine___lam__6___closed__0);
return v___x_1208_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__6___boxed(lean_object* v_x_1209_){
_start:
{
lean_object* v_res_1210_; 
v_res_1210_ = lp_algalVerification_Algal_Expr_machine___lam__6(v_x_1209_);
lean_dec(v_x_1209_);
return v_res_1210_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_machine_spec__4(lean_object* v_a_1211_, lean_object* v_a_1212_){
_start:
{
if (lean_obj_tag(v_a_1211_) == 0)
{
lean_object* v___x_1213_; 
v___x_1213_ = l_List_reverse___redArg(v_a_1212_);
return v___x_1213_;
}
else
{
lean_object* v_head_1214_; lean_object* v_tail_1215_; lean_object* v___x_1217_; uint8_t v_isShared_1218_; uint8_t v_isSharedCheck_1225_; 
v_head_1214_ = lean_ctor_get(v_a_1211_, 0);
v_tail_1215_ = lean_ctor_get(v_a_1211_, 1);
v_isSharedCheck_1225_ = !lean_is_exclusive(v_a_1211_);
if (v_isSharedCheck_1225_ == 0)
{
v___x_1217_ = v_a_1211_;
v_isShared_1218_ = v_isSharedCheck_1225_;
goto v_resetjp_1216_;
}
else
{
lean_inc(v_tail_1215_);
lean_inc(v_head_1214_);
lean_dec(v_a_1211_);
v___x_1217_ = lean_box(0);
v_isShared_1218_ = v_isSharedCheck_1225_;
goto v_resetjp_1216_;
}
v_resetjp_1216_:
{
lean_object* v___x_1219_; lean_object* v___x_1220_; lean_object* v___x_1222_; 
v___x_1219_ = lean_string_mk(v_head_1214_);
v___x_1220_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_1220_, 0, v___x_1219_);
if (v_isShared_1218_ == 0)
{
lean_ctor_set(v___x_1217_, 1, v_a_1212_);
lean_ctor_set(v___x_1217_, 0, v___x_1220_);
v___x_1222_ = v___x_1217_;
goto v_reusejp_1221_;
}
else
{
lean_object* v_reuseFailAlloc_1224_; 
v_reuseFailAlloc_1224_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1224_, 0, v___x_1220_);
lean_ctor_set(v_reuseFailAlloc_1224_, 1, v_a_1212_);
v___x_1222_ = v_reuseFailAlloc_1224_;
goto v_reusejp_1221_;
}
v_reusejp_1221_:
{
v_a_1211_ = v_tail_1215_;
v_a_1212_ = v___x_1222_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_machine_spec__0(lean_object* v_a_1226_, lean_object* v_a_1227_, lean_object* v_a_1228_){
_start:
{
if (lean_obj_tag(v_a_1227_) == 0)
{
lean_object* v___x_1229_; 
v___x_1229_ = l_List_reverse___redArg(v_a_1228_);
return v___x_1229_;
}
else
{
lean_object* v_head_1230_; lean_object* v_tail_1231_; lean_object* v___x_1233_; uint8_t v_isShared_1234_; uint8_t v_isSharedCheck_1244_; 
v_head_1230_ = lean_ctor_get(v_a_1227_, 0);
v_tail_1231_ = lean_ctor_get(v_a_1227_, 1);
v_isSharedCheck_1244_ = !lean_is_exclusive(v_a_1227_);
if (v_isSharedCheck_1244_ == 0)
{
v___x_1233_ = v_a_1227_;
v_isShared_1234_ = v_isSharedCheck_1244_;
goto v_resetjp_1232_;
}
else
{
lean_inc(v_tail_1231_);
lean_inc(v_head_1230_);
lean_dec(v_a_1227_);
v___x_1233_ = lean_box(0);
v_isShared_1234_ = v_isSharedCheck_1244_;
goto v_resetjp_1232_;
}
v_resetjp_1232_:
{
lean_object* v___y_1236_; lean_object* v___x_1241_; 
v___x_1241_ = lp_algalVerification_Algal_Core_Normalize_lookupFields(v_a_1226_, v_head_1230_);
lean_dec(v_head_1230_);
if (lean_obj_tag(v___x_1241_) == 0)
{
lean_object* v___x_1242_; 
v___x_1242_ = lean_box(0);
v___y_1236_ = v___x_1242_;
goto v___jp_1235_;
}
else
{
lean_object* v_val_1243_; 
v_val_1243_ = lean_ctor_get(v___x_1241_, 0);
lean_inc(v_val_1243_);
lean_dec_ref_known(v___x_1241_, 1);
v___y_1236_ = v_val_1243_;
goto v___jp_1235_;
}
v___jp_1235_:
{
lean_object* v___x_1238_; 
if (v_isShared_1234_ == 0)
{
lean_ctor_set(v___x_1233_, 1, v_a_1228_);
lean_ctor_set(v___x_1233_, 0, v___y_1236_);
v___x_1238_ = v___x_1233_;
goto v_reusejp_1237_;
}
else
{
lean_object* v_reuseFailAlloc_1240_; 
v_reuseFailAlloc_1240_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1240_, 0, v___y_1236_);
lean_ctor_set(v_reuseFailAlloc_1240_, 1, v_a_1228_);
v___x_1238_ = v_reuseFailAlloc_1240_;
goto v_reusejp_1237_;
}
v_reusejp_1237_:
{
v_a_1227_ = v_tail_1231_;
v_a_1228_ = v___x_1238_;
goto _start;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_machine_spec__0___boxed(lean_object* v_a_1245_, lean_object* v_a_1246_, lean_object* v_a_1247_){
_start:
{
lean_object* v_res_1248_; 
v_res_1248_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_machine_spec__0(v_a_1245_, v_a_1246_, v_a_1247_);
lean_dec(v_a_1245_);
return v_res_1248_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_machine_spec__1(lean_object* v_a_1249_, lean_object* v_a_1250_){
_start:
{
if (lean_obj_tag(v_a_1249_) == 0)
{
lean_object* v___x_1251_; 
v___x_1251_ = l_List_reverse___redArg(v_a_1250_);
return v___x_1251_;
}
else
{
lean_object* v_head_1252_; lean_object* v_tail_1253_; lean_object* v___x_1255_; uint8_t v_isShared_1256_; uint8_t v_isSharedCheck_1262_; 
v_head_1252_ = lean_ctor_get(v_a_1249_, 0);
v_tail_1253_ = lean_ctor_get(v_a_1249_, 1);
v_isSharedCheck_1262_ = !lean_is_exclusive(v_a_1249_);
if (v_isSharedCheck_1262_ == 0)
{
v___x_1255_ = v_a_1249_;
v_isShared_1256_ = v_isSharedCheck_1262_;
goto v_resetjp_1254_;
}
else
{
lean_inc(v_tail_1253_);
lean_inc(v_head_1252_);
lean_dec(v_a_1249_);
v___x_1255_ = lean_box(0);
v_isShared_1256_ = v_isSharedCheck_1262_;
goto v_resetjp_1254_;
}
v_resetjp_1254_:
{
lean_object* v___x_1257_; lean_object* v___x_1259_; 
v___x_1257_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_1257_, 0, v_head_1252_);
if (v_isShared_1256_ == 0)
{
lean_ctor_set(v___x_1255_, 1, v_a_1250_);
lean_ctor_set(v___x_1255_, 0, v___x_1257_);
v___x_1259_ = v___x_1255_;
goto v_reusejp_1258_;
}
else
{
lean_object* v_reuseFailAlloc_1261_; 
v_reuseFailAlloc_1261_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1261_, 0, v___x_1257_);
lean_ctor_set(v_reuseFailAlloc_1261_, 1, v_a_1250_);
v___x_1259_ = v_reuseFailAlloc_1261_;
goto v_reusejp_1258_;
}
v_reusejp_1258_:
{
v_a_1249_ = v_tail_1253_;
v_a_1250_ = v___x_1259_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_machine_spec__3(lean_object* v_x_1263_, lean_object* v_x_1264_){
_start:
{
if (lean_obj_tag(v_x_1264_) == 0)
{
return v_x_1263_;
}
else
{
lean_object* v_head_1265_; lean_object* v_tail_1266_; lean_object* v___x_1267_; lean_object* v___x_1268_; 
v_head_1265_ = lean_ctor_get(v_x_1264_, 0);
v_tail_1266_ = lean_ctor_get(v_x_1264_, 1);
v___x_1267_ = lean_string_utf8_byte_size(v_head_1265_);
v___x_1268_ = lean_nat_add(v_x_1263_, v___x_1267_);
lean_dec(v_x_1263_);
v_x_1263_ = v___x_1268_;
v_x_1264_ = v_tail_1266_;
goto _start;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_machine_spec__3___boxed(lean_object* v_x_1270_, lean_object* v_x_1271_){
_start:
{
lean_object* v_res_1272_; 
v_res_1272_ = lp_algalVerification_List_foldl___at___00Algal_Expr_machine_spec__3(v_x_1270_, v_x_1271_);
lean_dec(v_x_1271_);
return v_res_1272_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__24(lean_object* v_value_1274_, lean_object* v___x_1275_, lean_object* v_x_1276_){
_start:
{
lean_object* v___x_1277_; lean_object* v___x_1278_; lean_object* v___x_1279_; 
v___x_1277_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__24___closed__0));
v___x_1278_ = lp_algalVerification_Algal_Expr_errArity(v_value_1274_, v___x_1277_, v___x_1275_);
v___x_1279_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_1278_);
return v___x_1279_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__24___boxed(lean_object* v_value_1280_, lean_object* v___x_1281_, lean_object* v_x_1282_){
_start:
{
lean_object* v_res_1283_; 
v_res_1283_ = lp_algalVerification_Algal_Expr_machine___lam__24(v_value_1280_, v___x_1281_, v_x_1282_);
lean_dec(v_x_1282_);
return v_res_1283_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__22(lean_object* v_value_1285_, lean_object* v___x_1286_, lean_object* v_x_1287_){
_start:
{
lean_object* v___x_1288_; lean_object* v___x_1289_; lean_object* v___x_1290_; 
v___x_1288_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__22___closed__0));
v___x_1289_ = lp_algalVerification_Algal_Expr_errArity(v_value_1285_, v___x_1288_, v___x_1286_);
v___x_1290_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_1289_);
return v___x_1290_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__22___boxed(lean_object* v_value_1291_, lean_object* v___x_1292_, lean_object* v_x_1293_){
_start:
{
lean_object* v_res_1294_; 
v_res_1294_ = lp_algalVerification_Algal_Expr_machine___lam__22(v_value_1291_, v___x_1292_, v_x_1293_);
lean_dec(v_x_1293_);
return v_res_1294_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__21(lean_object* v_value_1296_, lean_object* v___x_1297_, lean_object* v_x_1298_){
_start:
{
lean_object* v___x_1299_; lean_object* v___x_1300_; lean_object* v___x_1301_; 
v___x_1299_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__21___closed__0));
v___x_1300_ = lp_algalVerification_Algal_Expr_errArity(v_value_1296_, v___x_1299_, v___x_1297_);
v___x_1301_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_1300_);
return v___x_1301_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__21___boxed(lean_object* v_value_1302_, lean_object* v___x_1303_, lean_object* v_x_1304_){
_start:
{
lean_object* v_res_1305_; 
v_res_1305_ = lp_algalVerification_Algal_Expr_machine___lam__21(v_value_1302_, v___x_1303_, v_x_1304_);
lean_dec(v_x_1304_);
return v_res_1305_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_isSuffixOf___at___00Algal_Expr_machine_spec__2(lean_object* v_l_u2081_1306_, lean_object* v_l_u2082_1307_){
_start:
{
lean_object* v___x_1308_; lean_object* v___x_1309_; uint8_t v___x_1310_; 
v___x_1308_ = l_List_reverse___redArg(v_l_u2081_1306_);
v___x_1309_ = l_List_reverse___redArg(v_l_u2082_1307_);
v___x_1310_ = lp_algalVerification_List_isPrefixOf___at___00Algal_Expr_charInfix_spec__0(v___x_1308_, v___x_1309_);
lean_dec(v___x_1309_);
lean_dec(v___x_1308_);
return v___x_1310_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_isSuffixOf___at___00Algal_Expr_machine_spec__2___boxed(lean_object* v_l_u2081_1311_, lean_object* v_l_u2082_1312_){
_start:
{
uint8_t v_res_1313_; lean_object* v_r_1314_; 
v_res_1313_ = lp_algalVerification_List_isSuffixOf___at___00Algal_Expr_machine_spec__2(v_l_u2081_1311_, v_l_u2082_1312_);
v_r_1314_ = lean_box(v_res_1313_);
return v_r_1314_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__18(lean_object* v_value_1316_, lean_object* v___x_1317_, lean_object* v_x_1318_){
_start:
{
lean_object* v___x_1319_; lean_object* v___x_1320_; lean_object* v___x_1321_; 
v___x_1319_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__18___closed__0));
v___x_1320_ = lp_algalVerification_Algal_Expr_errArity(v_value_1316_, v___x_1319_, v___x_1317_);
v___x_1321_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_1320_);
return v___x_1321_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__18___boxed(lean_object* v_value_1322_, lean_object* v___x_1323_, lean_object* v_x_1324_){
_start:
{
lean_object* v_res_1325_; 
v_res_1325_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_1322_, v___x_1323_, v_x_1324_);
lean_dec(v_x_1324_);
return v_res_1325_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_machine_spec__5(lean_object* v_x_1326_, lean_object* v_x_1327_){
_start:
{
if (lean_obj_tag(v_x_1327_) == 0)
{
return v_x_1326_;
}
else
{
lean_object* v_head_1328_; lean_object* v_tail_1329_; lean_object* v___x_1330_; 
v_head_1328_ = lean_ctor_get(v_x_1327_, 0);
v_tail_1329_ = lean_ctor_get(v_x_1327_, 1);
v___x_1330_ = lean_string_append(v_x_1326_, v_head_1328_);
v_x_1326_ = v___x_1330_;
v_x_1327_ = v_tail_1329_;
goto _start;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_machine_spec__5___boxed(lean_object* v_x_1332_, lean_object* v_x_1333_){
_start:
{
lean_object* v_res_1334_; 
v_res_1334_ = lp_algalVerification_List_foldl___at___00Algal_Expr_machine_spec__5(v_x_1332_, v_x_1333_);
lean_dec(v_x_1333_);
return v_res_1334_;
}
}
LEAN_EXPORT double lp_algalVerification_Algal_Expr_machine___lam__3(uint8_t v___x_1335_, double v___y_1336_, double v___y_1337_){
_start:
{
if (v___x_1335_ == 0)
{
double v___x_1338_; 
v___x_1338_ = lp_algalVerification_Algal_Expr_fmax(v___y_1336_, v___y_1337_);
return v___x_1338_;
}
else
{
double v___x_1339_; 
v___x_1339_ = lp_algalVerification_Algal_Expr_fmin(v___y_1336_, v___y_1337_);
return v___x_1339_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__3___boxed(lean_object* v___x_1340_, lean_object* v___y_1341_, lean_object* v___y_1342_){
_start:
{
uint8_t v___x_26113__boxed_1343_; double v___y_26114__boxed_1344_; double v___y_26115__boxed_1345_; double v_res_1346_; lean_object* v_r_1347_; 
v___x_26113__boxed_1343_ = lean_unbox(v___x_1340_);
v___y_26114__boxed_1344_ = lean_unbox_float(v___y_1341_);
lean_dec_ref(v___y_1341_);
v___y_26115__boxed_1345_ = lean_unbox_float(v___y_1342_);
lean_dec_ref(v___y_1342_);
v_res_1346_ = lp_algalVerification_Algal_Expr_machine___lam__3(v___x_26113__boxed_1343_, v___y_26114__boxed_1344_, v___y_26115__boxed_1345_);
v_r_1347_ = lean_box_float(v_res_1346_);
return v_r_1347_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__17(lean_object* v_value_1348_, lean_object* v_00___1349_){
_start:
{
lean_object* v___x_1350_; lean_object* v___x_1351_; 
v___x_1350_ = lp_algalVerification_Algal_Expr_errUnmodeled(v_value_1348_);
v___x_1351_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_1350_);
return v___x_1351_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_machine___closed__0(void){
_start:
{
lean_object* v___x_1353_; lean_object* v___x_1354_; 
v___x_1353_ = lean_unsigned_to_nat(1u);
v___x_1354_ = lp_algalVerification_Algal_Expr_charge(v___x_1353_);
return v___x_1354_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_machine___closed__1(void){
_start:
{
lean_object* v___x_1355_; lean_object* v___x_1356_; 
v___x_1355_ = lean_obj_once(&lp_algalVerification_Algal_Expr_mergeLoop___closed__1, &lp_algalVerification_Algal_Expr_mergeLoop___closed__1_once, _init_lp_algalVerification_Algal_Expr_mergeLoop___closed__1);
v___x_1356_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_1355_);
return v___x_1356_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_machine___closed__8(void){
_start:
{
lean_object* v___x_1370_; lean_object* v___x_1371_; 
v___x_1370_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__7));
v___x_1371_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_1370_);
return v___x_1371_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__16(lean_object* v_value_1419_, lean_object* v___x_1420_, lean_object* v_rest_1421_, lean_object* v_env_1422_, lean_object* v_scope_1423_, lean_object* v_00___1424_){
_start:
{
if (lean_obj_tag(v_rest_1421_) == 1)
{
lean_object* v_rest_1429_; 
v_rest_1429_ = lean_ctor_get(v_rest_1421_, 1);
if (lean_obj_tag(v_rest_1429_) == 0)
{
lean_object* v_value_1430_; lean_object* v___x_1431_; lean_object* v___x_1432_; uint8_t v___y_1434_; lean_object* v_result_1448_; 
lean_dec(v___x_1420_);
v_value_1430_ = lean_ctor_get(v_rest_1421_, 0);
lean_inc(v_value_1430_);
v___x_1431_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_1431_, 0, v_value_1430_);
v___x_1432_ = lp_algalVerification_Algal_Expr_machine(v_env_1422_, v_scope_1423_, v___x_1431_);
v_result_1448_ = lean_ctor_get(v___x_1432_, 0);
lean_inc_ref(v_result_1448_);
if (lean_obj_tag(v_result_1448_) == 0)
{
lean_object* v_charges_1449_; lean_object* v___x_1451_; uint8_t v_isShared_1452_; uint8_t v_isSharedCheck_1456_; 
lean_dec_ref(v_value_1419_);
v_charges_1449_ = lean_ctor_get(v___x_1432_, 1);
v_isSharedCheck_1456_ = !lean_is_exclusive(v___x_1432_);
if (v_isSharedCheck_1456_ == 0)
{
lean_object* v_unused_1457_; 
v_unused_1457_ = lean_ctor_get(v___x_1432_, 0);
lean_dec(v_unused_1457_);
v___x_1451_ = v___x_1432_;
v_isShared_1452_ = v_isSharedCheck_1456_;
goto v_resetjp_1450_;
}
else
{
lean_inc(v_charges_1449_);
lean_dec(v___x_1432_);
v___x_1451_ = lean_box(0);
v_isShared_1452_ = v_isSharedCheck_1456_;
goto v_resetjp_1450_;
}
v_resetjp_1450_:
{
lean_object* v___x_1454_; 
if (v_isShared_1452_ == 0)
{
v___x_1454_ = v___x_1451_;
goto v_reusejp_1453_;
}
else
{
lean_object* v_reuseFailAlloc_1455_; 
v_reuseFailAlloc_1455_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1455_, 0, v_result_1448_);
lean_ctor_set(v_reuseFailAlloc_1455_, 1, v_charges_1449_);
v___x_1454_ = v_reuseFailAlloc_1455_;
goto v_reusejp_1453_;
}
v_reusejp_1453_:
{
return v___x_1454_;
}
}
}
else
{
lean_object* v_a_1458_; 
v_a_1458_ = lean_ctor_get(v_result_1448_, 0);
lean_inc(v_a_1458_);
lean_dec_ref_known(v_result_1448_, 1);
switch(lean_obj_tag(v_a_1458_))
{
case 0:
{
lean_object* v___x_1459_; uint8_t v___x_1460_; 
v___x_1459_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__11));
v___x_1460_ = lean_string_dec_eq(v_value_1419_, v___x_1459_);
lean_dec_ref(v_value_1419_);
v___y_1434_ = v___x_1460_;
goto v___jp_1433_;
}
case 1:
{
lean_object* v___x_1461_; uint8_t v___x_1462_; 
lean_dec_ref_known(v_a_1458_, 0);
v___x_1461_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__8));
v___x_1462_ = lean_string_dec_eq(v_value_1419_, v___x_1461_);
lean_dec_ref(v_value_1419_);
v___y_1434_ = v___x_1462_;
goto v___jp_1433_;
}
case 2:
{
lean_object* v___x_1463_; uint8_t v___x_1464_; 
lean_dec_ref_known(v_a_1458_, 0);
v___x_1463_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__7));
v___x_1464_ = lean_string_dec_eq(v_value_1419_, v___x_1463_);
lean_dec_ref(v_value_1419_);
v___y_1434_ = v___x_1464_;
goto v___jp_1433_;
}
case 3:
{
lean_object* v___x_1465_; uint8_t v___x_1466_; 
lean_dec_ref_known(v_a_1458_, 1);
v___x_1465_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__6));
v___x_1466_ = lean_string_dec_eq(v_value_1419_, v___x_1465_);
lean_dec_ref(v_value_1419_);
v___y_1434_ = v___x_1466_;
goto v___jp_1433_;
}
case 4:
{
lean_object* v___x_1467_; uint8_t v___x_1468_; 
lean_dec_ref_known(v_a_1458_, 1);
v___x_1467_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__9));
v___x_1468_ = lean_string_dec_eq(v_value_1419_, v___x_1467_);
lean_dec_ref(v_value_1419_);
v___y_1434_ = v___x_1468_;
goto v___jp_1433_;
}
default: 
{
lean_object* v___x_1469_; uint8_t v___x_1470_; 
lean_dec_ref_known(v_a_1458_, 1);
v___x_1469_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__10));
v___x_1470_ = lean_string_dec_eq(v_value_1419_, v___x_1469_);
lean_dec_ref(v_value_1419_);
v___y_1434_ = v___x_1470_;
goto v___jp_1433_;
}
}
}
v___jp_1433_:
{
lean_object* v_charges_1435_; lean_object* v___x_1437_; uint8_t v_isShared_1438_; uint8_t v_isSharedCheck_1446_; 
v_charges_1435_ = lean_ctor_get(v___x_1432_, 1);
v_isSharedCheck_1446_ = !lean_is_exclusive(v___x_1432_);
if (v_isSharedCheck_1446_ == 0)
{
lean_object* v_unused_1447_; 
v_unused_1447_ = lean_ctor_get(v___x_1432_, 0);
lean_dec(v_unused_1447_);
v___x_1437_ = v___x_1432_;
v_isShared_1438_ = v_isSharedCheck_1446_;
goto v_resetjp_1436_;
}
else
{
lean_inc(v_charges_1435_);
lean_dec(v___x_1432_);
v___x_1437_ = lean_box(0);
v_isShared_1438_ = v_isSharedCheck_1446_;
goto v_resetjp_1436_;
}
v_resetjp_1436_:
{
lean_object* v___x_1439_; lean_object* v___x_1440_; lean_object* v___x_1441_; lean_object* v___x_1442_; lean_object* v___x_1444_; 
v___x_1439_ = lean_alloc_ctor(1, 0, 1);
lean_ctor_set_uint8(v___x_1439_, 0, v___y_1434_);
v___x_1440_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_1440_, 0, v___x_1439_);
v___x_1441_ = lean_box(0);
v___x_1442_ = l_List_appendTR___redArg(v_charges_1435_, v___x_1441_);
if (v_isShared_1438_ == 0)
{
lean_ctor_set(v___x_1437_, 1, v___x_1442_);
lean_ctor_set(v___x_1437_, 0, v___x_1440_);
v___x_1444_ = v___x_1437_;
goto v_reusejp_1443_;
}
else
{
lean_object* v_reuseFailAlloc_1445_; 
v_reuseFailAlloc_1445_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1445_, 0, v___x_1440_);
lean_ctor_set(v_reuseFailAlloc_1445_, 1, v___x_1442_);
v___x_1444_ = v_reuseFailAlloc_1445_;
goto v_reusejp_1443_;
}
v_reusejp_1443_:
{
return v___x_1444_;
}
}
}
}
else
{
lean_dec(v_scope_1423_);
goto v___jp_1425_;
}
}
else
{
lean_dec(v_scope_1423_);
goto v___jp_1425_;
}
v___jp_1425_:
{
lean_object* v___x_1426_; lean_object* v___x_1427_; lean_object* v___x_1428_; 
v___x_1426_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__22___closed__0));
v___x_1427_ = lp_algalVerification_Algal_Expr_errArity(v_value_1419_, v___x_1426_, v___x_1420_);
v___x_1428_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_1427_);
return v___x_1428_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__15(lean_object* v_value_1471_, lean_object* v___x_1472_, lean_object* v_rest_1473_, lean_object* v_env_1474_, lean_object* v_scope_1475_, lean_object* v_00___1476_){
_start:
{
if (lean_obj_tag(v_rest_1473_) == 1)
{
lean_object* v_rest_1481_; 
v_rest_1481_ = lean_ctor_get(v_rest_1473_, 1);
if (lean_obj_tag(v_rest_1481_) == 0)
{
lean_object* v_value_1482_; lean_object* v___x_1483_; lean_object* v___x_1484_; lean_object* v_result_1486_; lean_object* v_charges_1487_; lean_object* v_result_1498_; 
lean_dec(v___x_1472_);
v_value_1482_ = lean_ctor_get(v_rest_1473_, 0);
lean_inc(v_value_1482_);
v___x_1483_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_1483_, 0, v_value_1482_);
v___x_1484_ = lp_algalVerification_Algal_Expr_machine(v_env_1474_, v_scope_1475_, v___x_1483_);
v_result_1498_ = lean_ctor_get(v___x_1484_, 0);
lean_inc_ref(v_result_1498_);
if (lean_obj_tag(v_result_1498_) == 0)
{
lean_object* v_charges_1499_; lean_object* v___x_1501_; uint8_t v_isShared_1502_; uint8_t v_isSharedCheck_1506_; 
lean_dec_ref(v_value_1471_);
v_charges_1499_ = lean_ctor_get(v___x_1484_, 1);
v_isSharedCheck_1506_ = !lean_is_exclusive(v___x_1484_);
if (v_isSharedCheck_1506_ == 0)
{
lean_object* v_unused_1507_; 
v_unused_1507_ = lean_ctor_get(v___x_1484_, 0);
lean_dec(v_unused_1507_);
v___x_1501_ = v___x_1484_;
v_isShared_1502_ = v_isSharedCheck_1506_;
goto v_resetjp_1500_;
}
else
{
lean_inc(v_charges_1499_);
lean_dec(v___x_1484_);
v___x_1501_ = lean_box(0);
v_isShared_1502_ = v_isSharedCheck_1506_;
goto v_resetjp_1500_;
}
v_resetjp_1500_:
{
lean_object* v___x_1504_; 
if (v_isShared_1502_ == 0)
{
v___x_1504_ = v___x_1501_;
goto v_reusejp_1503_;
}
else
{
lean_object* v_reuseFailAlloc_1505_; 
v_reuseFailAlloc_1505_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1505_, 0, v_result_1498_);
lean_ctor_set(v_reuseFailAlloc_1505_, 1, v_charges_1499_);
v___x_1504_ = v_reuseFailAlloc_1505_;
goto v_reusejp_1503_;
}
v_reusejp_1503_:
{
return v___x_1504_;
}
}
}
else
{
lean_object* v_a_1508_; lean_object* v___x_1510_; uint8_t v_isShared_1511_; uint8_t v_isSharedCheck_1554_; 
v_a_1508_ = lean_ctor_get(v_result_1498_, 0);
v_isSharedCheck_1554_ = !lean_is_exclusive(v_result_1498_);
if (v_isSharedCheck_1554_ == 0)
{
v___x_1510_ = v_result_1498_;
v_isShared_1511_ = v_isSharedCheck_1554_;
goto v_resetjp_1509_;
}
else
{
lean_inc(v_a_1508_);
lean_dec(v_result_1498_);
v___x_1510_ = lean_box(0);
v_isShared_1511_ = v_isSharedCheck_1554_;
goto v_resetjp_1509_;
}
v_resetjp_1509_:
{
lean_object* v___x_1512_; lean_object* v___x_1513_; lean_object* v_result_1515_; lean_object* v_charges_1516_; lean_object* v_result_1519_; lean_object* v___x_1520_; 
v___x_1512_ = lean_unsigned_to_nat(0u);
lean_inc_ref(v_value_1471_);
v___x_1513_ = lp_algalVerification_Algal_Expr_asMap(v_value_1471_, v___x_1512_, v_a_1508_);
v_result_1519_ = lean_ctor_get(v___x_1513_, 0);
lean_inc_ref(v_result_1519_);
lean_dec_ref(v___x_1513_);
v___x_1520_ = lean_box(0);
if (lean_obj_tag(v_result_1519_) == 0)
{
lean_object* v_a_1521_; lean_object* v___x_1523_; uint8_t v_isShared_1524_; uint8_t v_isSharedCheck_1528_; 
lean_del_object(v___x_1510_);
lean_dec_ref(v_value_1471_);
v_a_1521_ = lean_ctor_get(v_result_1519_, 0);
v_isSharedCheck_1528_ = !lean_is_exclusive(v_result_1519_);
if (v_isSharedCheck_1528_ == 0)
{
v___x_1523_ = v_result_1519_;
v_isShared_1524_ = v_isSharedCheck_1528_;
goto v_resetjp_1522_;
}
else
{
lean_inc(v_a_1521_);
lean_dec(v_result_1519_);
v___x_1523_ = lean_box(0);
v_isShared_1524_ = v_isSharedCheck_1528_;
goto v_resetjp_1522_;
}
v_resetjp_1522_:
{
lean_object* v___x_1526_; 
if (v_isShared_1524_ == 0)
{
v___x_1526_ = v___x_1523_;
goto v_reusejp_1525_;
}
else
{
lean_object* v_reuseFailAlloc_1527_; 
v_reuseFailAlloc_1527_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1527_, 0, v_a_1521_);
v___x_1526_ = v_reuseFailAlloc_1527_;
goto v_reusejp_1525_;
}
v_reusejp_1525_:
{
v_result_1486_ = v___x_1526_;
v_charges_1487_ = v___x_1520_;
goto v___jp_1485_;
}
}
}
else
{
lean_object* v_a_1529_; lean_object* v___x_1531_; uint8_t v_isShared_1532_; uint8_t v_isSharedCheck_1553_; 
v_a_1529_ = lean_ctor_get(v_result_1519_, 0);
v_isSharedCheck_1553_ = !lean_is_exclusive(v_result_1519_);
if (v_isSharedCheck_1553_ == 0)
{
v___x_1531_ = v_result_1519_;
v_isShared_1532_ = v_isSharedCheck_1553_;
goto v_resetjp_1530_;
}
else
{
lean_inc(v_a_1529_);
lean_dec(v_result_1519_);
v___x_1531_ = lean_box(0);
v_isShared_1532_ = v_isSharedCheck_1553_;
goto v_resetjp_1530_;
}
v_resetjp_1530_:
{
lean_object* v___x_1533_; lean_object* v___x_1534_; lean_object* v___x_1535_; uint8_t v___x_1536_; 
v___x_1533_ = lp_algalVerification_Algal_Expr_fieldNames(v_a_1529_);
v___x_1534_ = lp_algalVerification_Algal_Core_Text_canonicalKeys(v___x_1533_);
v___x_1535_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__15___closed__0));
v___x_1536_ = lean_string_dec_eq(v_value_1471_, v___x_1535_);
lean_dec_ref(v_value_1471_);
if (v___x_1536_ == 0)
{
lean_object* v___x_1537_; lean_object* v___x_1538_; lean_object* v___x_1540_; 
v___x_1537_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_machine_spec__0(v_a_1529_, v___x_1534_, v___x_1520_);
lean_dec(v_a_1529_);
v___x_1538_ = lp_algalVerification_Algal_Expr_itemsFromList(v___x_1537_);
if (v_isShared_1511_ == 0)
{
lean_ctor_set_tag(v___x_1510_, 4);
lean_ctor_set(v___x_1510_, 0, v___x_1538_);
v___x_1540_ = v___x_1510_;
goto v_reusejp_1539_;
}
else
{
lean_object* v_reuseFailAlloc_1544_; 
v_reuseFailAlloc_1544_ = lean_alloc_ctor(4, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1544_, 0, v___x_1538_);
v___x_1540_ = v_reuseFailAlloc_1544_;
goto v_reusejp_1539_;
}
v_reusejp_1539_:
{
lean_object* v___x_1542_; 
if (v_isShared_1532_ == 0)
{
lean_ctor_set(v___x_1531_, 0, v___x_1540_);
v___x_1542_ = v___x_1531_;
goto v_reusejp_1541_;
}
else
{
lean_object* v_reuseFailAlloc_1543_; 
v_reuseFailAlloc_1543_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1543_, 0, v___x_1540_);
v___x_1542_ = v_reuseFailAlloc_1543_;
goto v_reusejp_1541_;
}
v_reusejp_1541_:
{
v_result_1515_ = v___x_1542_;
v_charges_1516_ = v___x_1520_;
goto v___jp_1514_;
}
}
}
else
{
lean_object* v___x_1545_; lean_object* v___x_1546_; lean_object* v___x_1548_; 
lean_dec(v_a_1529_);
v___x_1545_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_machine_spec__1(v___x_1534_, v___x_1520_);
v___x_1546_ = lp_algalVerification_Algal_Expr_itemsFromList(v___x_1545_);
if (v_isShared_1511_ == 0)
{
lean_ctor_set_tag(v___x_1510_, 4);
lean_ctor_set(v___x_1510_, 0, v___x_1546_);
v___x_1548_ = v___x_1510_;
goto v_reusejp_1547_;
}
else
{
lean_object* v_reuseFailAlloc_1552_; 
v_reuseFailAlloc_1552_ = lean_alloc_ctor(4, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1552_, 0, v___x_1546_);
v___x_1548_ = v_reuseFailAlloc_1552_;
goto v_reusejp_1547_;
}
v_reusejp_1547_:
{
lean_object* v___x_1550_; 
if (v_isShared_1532_ == 0)
{
lean_ctor_set(v___x_1531_, 0, v___x_1548_);
v___x_1550_ = v___x_1531_;
goto v_reusejp_1549_;
}
else
{
lean_object* v_reuseFailAlloc_1551_; 
v_reuseFailAlloc_1551_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1551_, 0, v___x_1548_);
v___x_1550_ = v_reuseFailAlloc_1551_;
goto v_reusejp_1549_;
}
v_reusejp_1549_:
{
v_result_1515_ = v___x_1550_;
v_charges_1516_ = v___x_1520_;
goto v___jp_1514_;
}
}
}
}
}
v___jp_1514_:
{
lean_object* v___x_1517_; lean_object* v___x_1518_; 
v___x_1517_ = lean_box(0);
v___x_1518_ = l_List_appendTR___redArg(v___x_1517_, v_charges_1516_);
v_result_1486_ = v_result_1515_;
v_charges_1487_ = v___x_1518_;
goto v___jp_1485_;
}
}
}
v___jp_1485_:
{
lean_object* v_charges_1488_; lean_object* v___x_1490_; uint8_t v_isShared_1491_; uint8_t v_isSharedCheck_1496_; 
v_charges_1488_ = lean_ctor_get(v___x_1484_, 1);
v_isSharedCheck_1496_ = !lean_is_exclusive(v___x_1484_);
if (v_isSharedCheck_1496_ == 0)
{
lean_object* v_unused_1497_; 
v_unused_1497_ = lean_ctor_get(v___x_1484_, 0);
lean_dec(v_unused_1497_);
v___x_1490_ = v___x_1484_;
v_isShared_1491_ = v_isSharedCheck_1496_;
goto v_resetjp_1489_;
}
else
{
lean_inc(v_charges_1488_);
lean_dec(v___x_1484_);
v___x_1490_ = lean_box(0);
v_isShared_1491_ = v_isSharedCheck_1496_;
goto v_resetjp_1489_;
}
v_resetjp_1489_:
{
lean_object* v___x_1492_; lean_object* v___x_1494_; 
v___x_1492_ = l_List_appendTR___redArg(v_charges_1488_, v_charges_1487_);
if (v_isShared_1491_ == 0)
{
lean_ctor_set(v___x_1490_, 1, v___x_1492_);
lean_ctor_set(v___x_1490_, 0, v_result_1486_);
v___x_1494_ = v___x_1490_;
goto v_reusejp_1493_;
}
else
{
lean_object* v_reuseFailAlloc_1495_; 
v_reuseFailAlloc_1495_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1495_, 0, v_result_1486_);
lean_ctor_set(v_reuseFailAlloc_1495_, 1, v___x_1492_);
v___x_1494_ = v_reuseFailAlloc_1495_;
goto v_reusejp_1493_;
}
v_reusejp_1493_:
{
return v___x_1494_;
}
}
}
}
else
{
lean_dec(v_scope_1475_);
goto v___jp_1477_;
}
}
else
{
lean_dec(v_scope_1475_);
goto v___jp_1477_;
}
v___jp_1477_:
{
lean_object* v___x_1478_; lean_object* v___x_1479_; lean_object* v___x_1480_; 
v___x_1478_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__22___closed__0));
v___x_1479_ = lp_algalVerification_Algal_Expr_errArity(v_value_1471_, v___x_1478_, v___x_1472_);
v___x_1480_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_1479_);
return v___x_1480_;
}
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_machine___lam__4___closed__1(void){
_start:
{
lean_object* v___x_1555_; lean_object* v___x_1556_; 
v___x_1555_ = lean_box(0);
v___x_1556_ = l_List_appendTR___redArg(v___x_1555_, v___x_1555_);
return v___x_1556_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__14(lean_object* v_value_1557_, lean_object* v___x_1558_, lean_object* v_rest_1559_, lean_object* v_env_1560_, lean_object* v_scope_1561_, lean_object* v_00___1562_){
_start:
{
if (lean_obj_tag(v_rest_1559_) == 1)
{
lean_object* v_rest_1567_; 
v_rest_1567_ = lean_ctor_get(v_rest_1559_, 1);
if (lean_obj_tag(v_rest_1567_) == 1)
{
lean_object* v_rest_1568_; 
v_rest_1568_ = lean_ctor_get(v_rest_1567_, 1);
if (lean_obj_tag(v_rest_1568_) == 0)
{
lean_object* v_value_1569_; lean_object* v_value_1570_; lean_object* v___x_1571_; lean_object* v___x_1572_; lean_object* v_result_1574_; lean_object* v_charges_1575_; lean_object* v_result_1586_; 
lean_dec(v___x_1558_);
v_value_1569_ = lean_ctor_get(v_rest_1559_, 0);
v_value_1570_ = lean_ctor_get(v_rest_1567_, 0);
lean_inc(v_value_1569_);
v___x_1571_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_1571_, 0, v_value_1569_);
lean_inc(v_scope_1561_);
v___x_1572_ = lp_algalVerification_Algal_Expr_machine(v_env_1560_, v_scope_1561_, v___x_1571_);
v_result_1586_ = lean_ctor_get(v___x_1572_, 0);
lean_inc_ref(v_result_1586_);
if (lean_obj_tag(v_result_1586_) == 0)
{
lean_object* v_charges_1587_; lean_object* v___x_1589_; uint8_t v_isShared_1590_; uint8_t v_isSharedCheck_1594_; 
lean_dec(v_scope_1561_);
lean_dec_ref(v_value_1557_);
v_charges_1587_ = lean_ctor_get(v___x_1572_, 1);
v_isSharedCheck_1594_ = !lean_is_exclusive(v___x_1572_);
if (v_isSharedCheck_1594_ == 0)
{
lean_object* v_unused_1595_; 
v_unused_1595_ = lean_ctor_get(v___x_1572_, 0);
lean_dec(v_unused_1595_);
v___x_1589_ = v___x_1572_;
v_isShared_1590_ = v_isSharedCheck_1594_;
goto v_resetjp_1588_;
}
else
{
lean_inc(v_charges_1587_);
lean_dec(v___x_1572_);
v___x_1589_ = lean_box(0);
v_isShared_1590_ = v_isSharedCheck_1594_;
goto v_resetjp_1588_;
}
v_resetjp_1588_:
{
lean_object* v___x_1592_; 
if (v_isShared_1590_ == 0)
{
v___x_1592_ = v___x_1589_;
goto v_reusejp_1591_;
}
else
{
lean_object* v_reuseFailAlloc_1593_; 
v_reuseFailAlloc_1593_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1593_, 0, v_result_1586_);
lean_ctor_set(v_reuseFailAlloc_1593_, 1, v_charges_1587_);
v___x_1592_ = v_reuseFailAlloc_1593_;
goto v_reusejp_1591_;
}
v_reusejp_1591_:
{
return v___x_1592_;
}
}
}
else
{
lean_object* v_a_1596_; lean_object* v___x_1598_; uint8_t v_isShared_1599_; uint8_t v_isSharedCheck_1668_; 
v_a_1596_ = lean_ctor_get(v_result_1586_, 0);
v_isSharedCheck_1668_ = !lean_is_exclusive(v_result_1586_);
if (v_isSharedCheck_1668_ == 0)
{
v___x_1598_ = v_result_1586_;
v_isShared_1599_ = v_isSharedCheck_1668_;
goto v_resetjp_1597_;
}
else
{
lean_inc(v_a_1596_);
lean_dec(v_result_1586_);
v___x_1598_ = lean_box(0);
v_isShared_1599_ = v_isSharedCheck_1668_;
goto v_resetjp_1597_;
}
v_resetjp_1597_:
{
lean_object* v___x_1600_; lean_object* v___x_1601_; lean_object* v_result_1603_; lean_object* v_charges_1604_; lean_object* v_result_1607_; lean_object* v___x_1608_; 
v___x_1600_ = lean_unsigned_to_nat(0u);
lean_inc_ref(v_value_1557_);
v___x_1601_ = lp_algalVerification_Algal_Expr_asStr(v_value_1557_, v___x_1600_, v_a_1596_);
v_result_1607_ = lean_ctor_get(v___x_1601_, 0);
lean_inc_ref(v_result_1607_);
lean_dec_ref(v___x_1601_);
v___x_1608_ = lean_box(0);
if (lean_obj_tag(v_result_1607_) == 0)
{
lean_object* v_a_1609_; lean_object* v___x_1611_; uint8_t v_isShared_1612_; uint8_t v_isSharedCheck_1616_; 
lean_del_object(v___x_1598_);
lean_dec(v_scope_1561_);
lean_dec_ref(v_value_1557_);
v_a_1609_ = lean_ctor_get(v_result_1607_, 0);
v_isSharedCheck_1616_ = !lean_is_exclusive(v_result_1607_);
if (v_isSharedCheck_1616_ == 0)
{
v___x_1611_ = v_result_1607_;
v_isShared_1612_ = v_isSharedCheck_1616_;
goto v_resetjp_1610_;
}
else
{
lean_inc(v_a_1609_);
lean_dec(v_result_1607_);
v___x_1611_ = lean_box(0);
v_isShared_1612_ = v_isSharedCheck_1616_;
goto v_resetjp_1610_;
}
v_resetjp_1610_:
{
lean_object* v___x_1614_; 
if (v_isShared_1612_ == 0)
{
v___x_1614_ = v___x_1611_;
goto v_reusejp_1613_;
}
else
{
lean_object* v_reuseFailAlloc_1615_; 
v_reuseFailAlloc_1615_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1615_, 0, v_a_1609_);
v___x_1614_ = v_reuseFailAlloc_1615_;
goto v_reusejp_1613_;
}
v_reusejp_1613_:
{
v_result_1574_ = v___x_1614_;
v_charges_1575_ = v___x_1608_;
goto v___jp_1573_;
}
}
}
else
{
lean_object* v_a_1617_; lean_object* v___x_1619_; 
v_a_1617_ = lean_ctor_get(v_result_1607_, 0);
lean_inc(v_a_1617_);
lean_dec_ref_known(v_result_1607_, 1);
lean_inc(v_value_1570_);
if (v_isShared_1599_ == 0)
{
lean_ctor_set_tag(v___x_1598_, 0);
lean_ctor_set(v___x_1598_, 0, v_value_1570_);
v___x_1619_ = v___x_1598_;
goto v_reusejp_1618_;
}
else
{
lean_object* v_reuseFailAlloc_1667_; 
v_reuseFailAlloc_1667_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1667_, 0, v_value_1570_);
v___x_1619_ = v_reuseFailAlloc_1667_;
goto v_reusejp_1618_;
}
v_reusejp_1618_:
{
lean_object* v___x_1620_; lean_object* v_result_1622_; lean_object* v_charges_1623_; lean_object* v_result_1626_; 
v___x_1620_ = lp_algalVerification_Algal_Expr_machine(v_env_1560_, v_scope_1561_, v___x_1619_);
v_result_1626_ = lean_ctor_get(v___x_1620_, 0);
lean_inc_ref(v_result_1626_);
if (lean_obj_tag(v_result_1626_) == 0)
{
lean_object* v_charges_1627_; 
lean_dec(v_a_1617_);
lean_dec_ref(v_value_1557_);
v_charges_1627_ = lean_ctor_get(v___x_1620_, 1);
lean_inc(v_charges_1627_);
lean_dec_ref(v___x_1620_);
v_result_1603_ = v_result_1626_;
v_charges_1604_ = v_charges_1627_;
goto v___jp_1602_;
}
else
{
lean_object* v_a_1628_; lean_object* v___x_1629_; lean_object* v___x_1630_; lean_object* v_result_1632_; lean_object* v_charges_1633_; lean_object* v_result_1635_; 
v_a_1628_ = lean_ctor_get(v_result_1626_, 0);
lean_inc(v_a_1628_);
lean_dec_ref_known(v_result_1626_, 1);
v___x_1629_ = lean_unsigned_to_nat(1u);
lean_inc_ref(v_value_1557_);
v___x_1630_ = lp_algalVerification_Algal_Expr_asStr(v_value_1557_, v___x_1629_, v_a_1628_);
v_result_1635_ = lean_ctor_get(v___x_1630_, 0);
lean_inc_ref(v_result_1635_);
lean_dec_ref(v___x_1630_);
if (lean_obj_tag(v_result_1635_) == 0)
{
lean_object* v_a_1636_; lean_object* v___x_1638_; uint8_t v_isShared_1639_; uint8_t v_isSharedCheck_1643_; 
lean_dec(v_a_1617_);
lean_dec_ref(v_value_1557_);
v_a_1636_ = lean_ctor_get(v_result_1635_, 0);
v_isSharedCheck_1643_ = !lean_is_exclusive(v_result_1635_);
if (v_isSharedCheck_1643_ == 0)
{
v___x_1638_ = v_result_1635_;
v_isShared_1639_ = v_isSharedCheck_1643_;
goto v_resetjp_1637_;
}
else
{
lean_inc(v_a_1636_);
lean_dec(v_result_1635_);
v___x_1638_ = lean_box(0);
v_isShared_1639_ = v_isSharedCheck_1643_;
goto v_resetjp_1637_;
}
v_resetjp_1637_:
{
lean_object* v___x_1641_; 
if (v_isShared_1639_ == 0)
{
v___x_1641_ = v___x_1638_;
goto v_reusejp_1640_;
}
else
{
lean_object* v_reuseFailAlloc_1642_; 
v_reuseFailAlloc_1642_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1642_, 0, v_a_1636_);
v___x_1641_ = v_reuseFailAlloc_1642_;
goto v_reusejp_1640_;
}
v_reusejp_1640_:
{
v_result_1622_ = v___x_1641_;
v_charges_1623_ = v___x_1608_;
goto v___jp_1621_;
}
}
}
else
{
lean_object* v_a_1644_; lean_object* v___x_1646_; uint8_t v_isShared_1647_; uint8_t v_isSharedCheck_1666_; 
v_a_1644_ = lean_ctor_get(v_result_1635_, 0);
v_isSharedCheck_1666_ = !lean_is_exclusive(v_result_1635_);
if (v_isSharedCheck_1666_ == 0)
{
v___x_1646_ = v_result_1635_;
v_isShared_1647_ = v_isSharedCheck_1666_;
goto v_resetjp_1645_;
}
else
{
lean_inc(v_a_1644_);
lean_dec(v_result_1635_);
v___x_1646_ = lean_box(0);
v_isShared_1647_ = v_isSharedCheck_1666_;
goto v_resetjp_1645_;
}
v_resetjp_1645_:
{
lean_object* v___x_1648_; lean_object* v___x_1649_; uint8_t v___y_1651_; lean_object* v___x_1658_; uint8_t v___x_1659_; 
v___x_1648_ = lean_string_utf8_byte_size(v_a_1617_);
v___x_1649_ = lp_algalVerification_Algal_Expr_charge(v___x_1648_);
v___x_1658_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__14___closed__0));
v___x_1659_ = lean_string_dec_eq(v_value_1557_, v___x_1658_);
lean_dec_ref(v_value_1557_);
if (v___x_1659_ == 0)
{
lean_object* v___x_1660_; lean_object* v___x_1661_; uint8_t v___x_1662_; 
v___x_1660_ = lean_string_data(v_a_1644_);
v___x_1661_ = lean_string_data(v_a_1617_);
v___x_1662_ = lp_algalVerification_List_isSuffixOf___at___00Algal_Expr_machine_spec__2(v___x_1660_, v___x_1661_);
v___y_1651_ = v___x_1662_;
goto v___jp_1650_;
}
else
{
lean_object* v___x_1663_; lean_object* v___x_1664_; uint8_t v___x_1665_; 
v___x_1663_ = lean_string_data(v_a_1644_);
v___x_1664_ = lean_string_data(v_a_1617_);
v___x_1665_ = lp_algalVerification_List_isPrefixOf___at___00Algal_Expr_charInfix_spec__0(v___x_1663_, v___x_1664_);
lean_dec(v___x_1664_);
lean_dec(v___x_1663_);
v___y_1651_ = v___x_1665_;
goto v___jp_1650_;
}
v___jp_1650_:
{
lean_object* v_charges_1652_; lean_object* v___x_1653_; lean_object* v___x_1655_; 
v_charges_1652_ = lean_ctor_get(v___x_1649_, 1);
lean_inc(v_charges_1652_);
lean_dec_ref(v___x_1649_);
v___x_1653_ = lean_alloc_ctor(1, 0, 1);
lean_ctor_set_uint8(v___x_1653_, 0, v___y_1651_);
if (v_isShared_1647_ == 0)
{
lean_ctor_set(v___x_1646_, 0, v___x_1653_);
v___x_1655_ = v___x_1646_;
goto v_reusejp_1654_;
}
else
{
lean_object* v_reuseFailAlloc_1657_; 
v_reuseFailAlloc_1657_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1657_, 0, v___x_1653_);
v___x_1655_ = v_reuseFailAlloc_1657_;
goto v_reusejp_1654_;
}
v_reusejp_1654_:
{
lean_object* v___x_1656_; 
v___x_1656_ = l_List_appendTR___redArg(v_charges_1652_, v___x_1608_);
v_result_1632_ = v___x_1655_;
v_charges_1633_ = v___x_1656_;
goto v___jp_1631_;
}
}
}
}
v___jp_1631_:
{
lean_object* v___x_1634_; 
v___x_1634_ = l_List_appendTR___redArg(v___x_1608_, v_charges_1633_);
v_result_1622_ = v_result_1632_;
v_charges_1623_ = v___x_1634_;
goto v___jp_1621_;
}
}
v___jp_1621_:
{
lean_object* v_charges_1624_; lean_object* v___x_1625_; 
v_charges_1624_ = lean_ctor_get(v___x_1620_, 1);
lean_inc(v_charges_1624_);
lean_dec_ref(v___x_1620_);
v___x_1625_ = l_List_appendTR___redArg(v_charges_1624_, v_charges_1623_);
v_result_1603_ = v_result_1622_;
v_charges_1604_ = v___x_1625_;
goto v___jp_1602_;
}
}
}
v___jp_1602_:
{
lean_object* v___x_1605_; lean_object* v___x_1606_; 
v___x_1605_ = lean_box(0);
v___x_1606_ = l_List_appendTR___redArg(v___x_1605_, v_charges_1604_);
v_result_1574_ = v_result_1603_;
v_charges_1575_ = v___x_1606_;
goto v___jp_1573_;
}
}
}
v___jp_1573_:
{
lean_object* v_charges_1576_; lean_object* v___x_1578_; uint8_t v_isShared_1579_; uint8_t v_isSharedCheck_1584_; 
v_charges_1576_ = lean_ctor_get(v___x_1572_, 1);
v_isSharedCheck_1584_ = !lean_is_exclusive(v___x_1572_);
if (v_isSharedCheck_1584_ == 0)
{
lean_object* v_unused_1585_; 
v_unused_1585_ = lean_ctor_get(v___x_1572_, 0);
lean_dec(v_unused_1585_);
v___x_1578_ = v___x_1572_;
v_isShared_1579_ = v_isSharedCheck_1584_;
goto v_resetjp_1577_;
}
else
{
lean_inc(v_charges_1576_);
lean_dec(v___x_1572_);
v___x_1578_ = lean_box(0);
v_isShared_1579_ = v_isSharedCheck_1584_;
goto v_resetjp_1577_;
}
v_resetjp_1577_:
{
lean_object* v___x_1580_; lean_object* v___x_1582_; 
v___x_1580_ = l_List_appendTR___redArg(v_charges_1576_, v_charges_1575_);
if (v_isShared_1579_ == 0)
{
lean_ctor_set(v___x_1578_, 1, v___x_1580_);
lean_ctor_set(v___x_1578_, 0, v_result_1574_);
v___x_1582_ = v___x_1578_;
goto v_reusejp_1581_;
}
else
{
lean_object* v_reuseFailAlloc_1583_; 
v_reuseFailAlloc_1583_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1583_, 0, v_result_1574_);
lean_ctor_set(v_reuseFailAlloc_1583_, 1, v___x_1580_);
v___x_1582_ = v_reuseFailAlloc_1583_;
goto v_reusejp_1581_;
}
v_reusejp_1581_:
{
return v___x_1582_;
}
}
}
}
else
{
lean_dec(v_scope_1561_);
goto v___jp_1563_;
}
}
else
{
lean_dec(v_scope_1561_);
goto v___jp_1563_;
}
}
else
{
lean_dec(v_scope_1561_);
goto v___jp_1563_;
}
v___jp_1563_:
{
lean_object* v___x_1564_; lean_object* v___x_1565_; lean_object* v___x_1566_; 
v___x_1564_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__18___closed__0));
v___x_1565_ = lp_algalVerification_Algal_Expr_errArity(v_value_1557_, v___x_1564_, v___x_1558_);
v___x_1566_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_1565_);
return v___x_1566_;
}
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_machine___lam__13___closed__1(void){
_start:
{
lean_object* v___x_1670_; lean_object* v___x_1671_; lean_object* v___x_1672_; 
v___x_1670_ = lean_unsigned_to_nat(65536u);
v___x_1671_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__13___closed__0));
v___x_1672_ = lp_algalVerification_Algal_Expr_errBounds(v___x_1671_, v___x_1670_);
return v___x_1672_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_machine___lam__13___closed__2(void){
_start:
{
lean_object* v___x_1673_; lean_object* v___x_1674_; 
v___x_1673_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__13___closed__1, &lp_algalVerification_Algal_Expr_machine___lam__13___closed__1_once, _init_lp_algalVerification_Algal_Expr_machine___lam__13___closed__1);
v___x_1674_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_1673_);
return v___x_1674_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_machine___closed__41(void){
_start:
{
lean_object* v___x_1676_; lean_object* v___x_1677_; lean_object* v___x_1678_; 
v___x_1676_ = lean_unsigned_to_nat(1024u);
v___x_1677_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__40));
v___x_1678_ = lp_algalVerification_Algal_Expr_errBounds(v___x_1677_, v___x_1676_);
return v___x_1678_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_machine___closed__42(void){
_start:
{
lean_object* v___x_1679_; lean_object* v___x_1680_; 
v___x_1679_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___closed__41, &lp_algalVerification_Algal_Expr_machine___closed__41_once, _init_lp_algalVerification_Algal_Expr_machine___closed__41);
v___x_1680_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_1679_);
return v___x_1680_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__13(lean_object* v_value_1682_, lean_object* v___x_1683_, lean_object* v_rest_1684_, lean_object* v_env_1685_, lean_object* v_scope_1686_, lean_object* v_00___1687_){
_start:
{
if (lean_obj_tag(v_rest_1684_) == 1)
{
lean_object* v_rest_1692_; 
v_rest_1692_ = lean_ctor_get(v_rest_1684_, 1);
if (lean_obj_tag(v_rest_1692_) == 0)
{
lean_object* v_value_1693_; lean_object* v___x_1694_; lean_object* v___x_1695_; lean_object* v_result_1697_; lean_object* v_charges_1698_; lean_object* v_result_1709_; 
lean_dec(v___x_1683_);
v_value_1693_ = lean_ctor_get(v_rest_1684_, 0);
lean_inc(v_value_1693_);
v___x_1694_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_1694_, 0, v_value_1693_);
v___x_1695_ = lp_algalVerification_Algal_Expr_machine(v_env_1685_, v_scope_1686_, v___x_1694_);
v_result_1709_ = lean_ctor_get(v___x_1695_, 0);
lean_inc_ref(v_result_1709_);
if (lean_obj_tag(v_result_1709_) == 0)
{
lean_object* v_charges_1710_; lean_object* v___x_1712_; uint8_t v_isShared_1713_; uint8_t v_isSharedCheck_1717_; 
lean_dec_ref(v_value_1682_);
v_charges_1710_ = lean_ctor_get(v___x_1695_, 1);
v_isSharedCheck_1717_ = !lean_is_exclusive(v___x_1695_);
if (v_isSharedCheck_1717_ == 0)
{
lean_object* v_unused_1718_; 
v_unused_1718_ = lean_ctor_get(v___x_1695_, 0);
lean_dec(v_unused_1718_);
v___x_1712_ = v___x_1695_;
v_isShared_1713_ = v_isSharedCheck_1717_;
goto v_resetjp_1711_;
}
else
{
lean_inc(v_charges_1710_);
lean_dec(v___x_1695_);
v___x_1712_ = lean_box(0);
v_isShared_1713_ = v_isSharedCheck_1717_;
goto v_resetjp_1711_;
}
v_resetjp_1711_:
{
lean_object* v___x_1715_; 
if (v_isShared_1713_ == 0)
{
v___x_1715_ = v___x_1712_;
goto v_reusejp_1714_;
}
else
{
lean_object* v_reuseFailAlloc_1716_; 
v_reuseFailAlloc_1716_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1716_, 0, v_result_1709_);
lean_ctor_set(v_reuseFailAlloc_1716_, 1, v_charges_1710_);
v___x_1715_ = v_reuseFailAlloc_1716_;
goto v_reusejp_1714_;
}
v_reusejp_1714_:
{
return v___x_1715_;
}
}
}
else
{
lean_object* v_a_1719_; lean_object* v___x_1721_; uint8_t v_isShared_1722_; uint8_t v_isSharedCheck_1772_; 
v_a_1719_ = lean_ctor_get(v_result_1709_, 0);
v_isSharedCheck_1772_ = !lean_is_exclusive(v_result_1709_);
if (v_isSharedCheck_1772_ == 0)
{
v___x_1721_ = v_result_1709_;
v_isShared_1722_ = v_isSharedCheck_1772_;
goto v_resetjp_1720_;
}
else
{
lean_inc(v_a_1719_);
lean_dec(v_result_1709_);
v___x_1721_ = lean_box(0);
v_isShared_1722_ = v_isSharedCheck_1772_;
goto v_resetjp_1720_;
}
v_resetjp_1720_:
{
lean_object* v___x_1723_; lean_object* v___x_1724_; lean_object* v_result_1726_; lean_object* v_charges_1727_; lean_object* v_result_1730_; lean_object* v___x_1731_; 
v___x_1723_ = lean_unsigned_to_nat(0u);
lean_inc_ref(v_value_1682_);
v___x_1724_ = lp_algalVerification_Algal_Expr_asStr(v_value_1682_, v___x_1723_, v_a_1719_);
v_result_1730_ = lean_ctor_get(v___x_1724_, 0);
lean_inc_ref(v_result_1730_);
lean_dec_ref(v___x_1724_);
v___x_1731_ = lean_box(0);
if (lean_obj_tag(v_result_1730_) == 0)
{
lean_object* v_a_1732_; lean_object* v___x_1734_; uint8_t v_isShared_1735_; uint8_t v_isSharedCheck_1739_; 
lean_del_object(v___x_1721_);
lean_dec_ref(v_value_1682_);
v_a_1732_ = lean_ctor_get(v_result_1730_, 0);
v_isSharedCheck_1739_ = !lean_is_exclusive(v_result_1730_);
if (v_isSharedCheck_1739_ == 0)
{
v___x_1734_ = v_result_1730_;
v_isShared_1735_ = v_isSharedCheck_1739_;
goto v_resetjp_1733_;
}
else
{
lean_inc(v_a_1732_);
lean_dec(v_result_1730_);
v___x_1734_ = lean_box(0);
v_isShared_1735_ = v_isSharedCheck_1739_;
goto v_resetjp_1733_;
}
v_resetjp_1733_:
{
lean_object* v___x_1737_; 
if (v_isShared_1735_ == 0)
{
v___x_1737_ = v___x_1734_;
goto v_reusejp_1736_;
}
else
{
lean_object* v_reuseFailAlloc_1738_; 
v_reuseFailAlloc_1738_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1738_, 0, v_a_1732_);
v___x_1737_ = v_reuseFailAlloc_1738_;
goto v_reusejp_1736_;
}
v_reusejp_1736_:
{
v_result_1697_ = v___x_1737_;
v_charges_1698_ = v___x_1731_;
goto v___jp_1696_;
}
}
}
else
{
lean_object* v_a_1740_; lean_object* v___x_1742_; uint8_t v_isShared_1743_; uint8_t v_isSharedCheck_1771_; 
v_a_1740_ = lean_ctor_get(v_result_1730_, 0);
v_isSharedCheck_1771_ = !lean_is_exclusive(v_result_1730_);
if (v_isSharedCheck_1771_ == 0)
{
v___x_1742_ = v_result_1730_;
v_isShared_1743_ = v_isSharedCheck_1771_;
goto v_resetjp_1741_;
}
else
{
lean_inc(v_a_1740_);
lean_dec(v_result_1730_);
v___x_1742_ = lean_box(0);
v_isShared_1743_ = v_isSharedCheck_1771_;
goto v_resetjp_1741_;
}
v_resetjp_1741_:
{
lean_object* v___x_1744_; lean_object* v___x_1745_; lean_object* v_result_1747_; lean_object* v_charges_1748_; lean_object* v___y_1752_; lean_object* v___x_1764_; uint8_t v___x_1765_; 
v___x_1744_ = lean_string_utf8_byte_size(v_a_1740_);
v___x_1745_ = lp_algalVerification_Algal_Expr_charge(v___x_1744_);
v___x_1764_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__13___closed__3));
v___x_1765_ = lean_string_dec_eq(v_value_1682_, v___x_1764_);
if (v___x_1765_ == 0)
{
lean_object* v___x_1766_; uint8_t v___x_1767_; 
v___x_1766_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__13___closed__4));
v___x_1767_ = lean_string_dec_eq(v_value_1682_, v___x_1766_);
lean_dec_ref(v_value_1682_);
if (v___x_1767_ == 0)
{
lean_object* v___x_1768_; 
v___x_1768_ = lp_algalVerification_Algal_Expr_trimStr(v_a_1740_);
v___y_1752_ = v___x_1768_;
goto v___jp_1751_;
}
else
{
lean_object* v___x_1769_; 
v___x_1769_ = lp_algalVerification_Algal_Expr_lowerStr(v_a_1740_);
v___y_1752_ = v___x_1769_;
goto v___jp_1751_;
}
}
else
{
lean_object* v___x_1770_; 
lean_dec_ref(v_value_1682_);
v___x_1770_ = lp_algalVerification_Algal_Expr_upperStr(v_a_1740_);
v___y_1752_ = v___x_1770_;
goto v___jp_1751_;
}
v___jp_1746_:
{
lean_object* v_charges_1749_; lean_object* v___x_1750_; 
v_charges_1749_ = lean_ctor_get(v___x_1745_, 1);
lean_inc(v_charges_1749_);
lean_dec_ref(v___x_1745_);
v___x_1750_ = l_List_appendTR___redArg(v_charges_1749_, v_charges_1748_);
v_result_1726_ = v_result_1747_;
v_charges_1727_ = v___x_1750_;
goto v___jp_1725_;
}
v___jp_1751_:
{
lean_object* v___x_1753_; lean_object* v___x_1754_; uint8_t v___x_1755_; 
v___x_1753_ = lean_unsigned_to_nat(65536u);
v___x_1754_ = lean_string_utf8_byte_size(v___y_1752_);
v___x_1755_ = lean_nat_dec_lt(v___x_1753_, v___x_1754_);
if (v___x_1755_ == 0)
{
lean_object* v___x_1757_; 
if (v_isShared_1722_ == 0)
{
lean_ctor_set_tag(v___x_1721_, 3);
lean_ctor_set(v___x_1721_, 0, v___y_1752_);
v___x_1757_ = v___x_1721_;
goto v_reusejp_1756_;
}
else
{
lean_object* v_reuseFailAlloc_1761_; 
v_reuseFailAlloc_1761_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1761_, 0, v___y_1752_);
v___x_1757_ = v_reuseFailAlloc_1761_;
goto v_reusejp_1756_;
}
v_reusejp_1756_:
{
lean_object* v___x_1759_; 
if (v_isShared_1743_ == 0)
{
lean_ctor_set(v___x_1742_, 0, v___x_1757_);
v___x_1759_ = v___x_1742_;
goto v_reusejp_1758_;
}
else
{
lean_object* v_reuseFailAlloc_1760_; 
v_reuseFailAlloc_1760_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1760_, 0, v___x_1757_);
v___x_1759_ = v_reuseFailAlloc_1760_;
goto v_reusejp_1758_;
}
v_reusejp_1758_:
{
v_result_1747_ = v___x_1759_;
v_charges_1748_ = v___x_1731_;
goto v___jp_1746_;
}
}
}
else
{
lean_object* v___x_1762_; lean_object* v_result_1763_; 
lean_dec_ref(v___y_1752_);
lean_del_object(v___x_1742_);
lean_del_object(v___x_1721_);
v___x_1762_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__13___closed__2, &lp_algalVerification_Algal_Expr_machine___lam__13___closed__2_once, _init_lp_algalVerification_Algal_Expr_machine___lam__13___closed__2);
v_result_1763_ = lean_ctor_get(v___x_1762_, 0);
lean_inc_ref(v_result_1763_);
v_result_1747_ = v_result_1763_;
v_charges_1748_ = v___x_1731_;
goto v___jp_1746_;
}
}
}
}
v___jp_1725_:
{
lean_object* v___x_1728_; lean_object* v___x_1729_; 
v___x_1728_ = lean_box(0);
v___x_1729_ = l_List_appendTR___redArg(v___x_1728_, v_charges_1727_);
v_result_1697_ = v_result_1726_;
v_charges_1698_ = v___x_1729_;
goto v___jp_1696_;
}
}
}
v___jp_1696_:
{
lean_object* v_charges_1699_; lean_object* v___x_1701_; uint8_t v_isShared_1702_; uint8_t v_isSharedCheck_1707_; 
v_charges_1699_ = lean_ctor_get(v___x_1695_, 1);
v_isSharedCheck_1707_ = !lean_is_exclusive(v___x_1695_);
if (v_isSharedCheck_1707_ == 0)
{
lean_object* v_unused_1708_; 
v_unused_1708_ = lean_ctor_get(v___x_1695_, 0);
lean_dec(v_unused_1708_);
v___x_1701_ = v___x_1695_;
v_isShared_1702_ = v_isSharedCheck_1707_;
goto v_resetjp_1700_;
}
else
{
lean_inc(v_charges_1699_);
lean_dec(v___x_1695_);
v___x_1701_ = lean_box(0);
v_isShared_1702_ = v_isSharedCheck_1707_;
goto v_resetjp_1700_;
}
v_resetjp_1700_:
{
lean_object* v___x_1703_; lean_object* v___x_1705_; 
v___x_1703_ = l_List_appendTR___redArg(v_charges_1699_, v_charges_1698_);
if (v_isShared_1702_ == 0)
{
lean_ctor_set(v___x_1701_, 1, v___x_1703_);
lean_ctor_set(v___x_1701_, 0, v_result_1697_);
v___x_1705_ = v___x_1701_;
goto v_reusejp_1704_;
}
else
{
lean_object* v_reuseFailAlloc_1706_; 
v_reuseFailAlloc_1706_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1706_, 0, v_result_1697_);
lean_ctor_set(v_reuseFailAlloc_1706_, 1, v___x_1703_);
v___x_1705_ = v_reuseFailAlloc_1706_;
goto v_reusejp_1704_;
}
v_reusejp_1704_:
{
return v___x_1705_;
}
}
}
}
else
{
lean_dec(v_scope_1686_);
goto v___jp_1688_;
}
}
else
{
lean_dec(v_scope_1686_);
goto v___jp_1688_;
}
v___jp_1688_:
{
lean_object* v___x_1689_; lean_object* v___x_1690_; lean_object* v___x_1691_; 
v___x_1689_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__22___closed__0));
v___x_1690_ = lp_algalVerification_Algal_Expr_errArity(v_value_1682_, v___x_1689_, v___x_1683_);
v___x_1691_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_1690_);
return v___x_1691_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__12(lean_object* v_value_1773_, lean_object* v___x_1774_, lean_object* v_rest_1775_, lean_object* v_env_1776_, lean_object* v_scope_1777_, lean_object* v_00___1778_){
_start:
{
if (lean_obj_tag(v_rest_1775_) == 1)
{
lean_object* v_rest_1783_; 
v_rest_1783_ = lean_ctor_get(v_rest_1775_, 1);
if (lean_obj_tag(v_rest_1783_) == 1)
{
lean_object* v_rest_1784_; 
v_rest_1784_ = lean_ctor_get(v_rest_1783_, 1);
if (lean_obj_tag(v_rest_1784_) == 0)
{
lean_object* v_value_1785_; lean_object* v_value_1786_; lean_object* v___x_1787_; lean_object* v___x_1788_; lean_object* v_result_1790_; lean_object* v_charges_1791_; lean_object* v_result_1802_; 
lean_dec(v___x_1774_);
v_value_1785_ = lean_ctor_get(v_rest_1775_, 0);
v_value_1786_ = lean_ctor_get(v_rest_1783_, 0);
lean_inc(v_value_1785_);
v___x_1787_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_1787_, 0, v_value_1785_);
lean_inc(v_scope_1777_);
v___x_1788_ = lp_algalVerification_Algal_Expr_machine(v_env_1776_, v_scope_1777_, v___x_1787_);
v_result_1802_ = lean_ctor_get(v___x_1788_, 0);
lean_inc_ref(v_result_1802_);
if (lean_obj_tag(v_result_1802_) == 0)
{
lean_object* v_charges_1803_; lean_object* v___x_1805_; uint8_t v_isShared_1806_; uint8_t v_isSharedCheck_1810_; 
lean_dec(v_scope_1777_);
lean_dec_ref(v_value_1773_);
v_charges_1803_ = lean_ctor_get(v___x_1788_, 1);
v_isSharedCheck_1810_ = !lean_is_exclusive(v___x_1788_);
if (v_isSharedCheck_1810_ == 0)
{
lean_object* v_unused_1811_; 
v_unused_1811_ = lean_ctor_get(v___x_1788_, 0);
lean_dec(v_unused_1811_);
v___x_1805_ = v___x_1788_;
v_isShared_1806_ = v_isSharedCheck_1810_;
goto v_resetjp_1804_;
}
else
{
lean_inc(v_charges_1803_);
lean_dec(v___x_1788_);
v___x_1805_ = lean_box(0);
v_isShared_1806_ = v_isSharedCheck_1810_;
goto v_resetjp_1804_;
}
v_resetjp_1804_:
{
lean_object* v___x_1808_; 
if (v_isShared_1806_ == 0)
{
v___x_1808_ = v___x_1805_;
goto v_reusejp_1807_;
}
else
{
lean_object* v_reuseFailAlloc_1809_; 
v_reuseFailAlloc_1809_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1809_, 0, v_result_1802_);
lean_ctor_set(v_reuseFailAlloc_1809_, 1, v_charges_1803_);
v___x_1808_ = v_reuseFailAlloc_1809_;
goto v_reusejp_1807_;
}
v_reusejp_1807_:
{
return v___x_1808_;
}
}
}
else
{
lean_object* v_a_1812_; lean_object* v___x_1814_; uint8_t v_isShared_1815_; uint8_t v_isSharedCheck_1875_; 
v_a_1812_ = lean_ctor_get(v_result_1802_, 0);
v_isSharedCheck_1875_ = !lean_is_exclusive(v_result_1802_);
if (v_isSharedCheck_1875_ == 0)
{
v___x_1814_ = v_result_1802_;
v_isShared_1815_ = v_isSharedCheck_1875_;
goto v_resetjp_1813_;
}
else
{
lean_inc(v_a_1812_);
lean_dec(v_result_1802_);
v___x_1814_ = lean_box(0);
v_isShared_1815_ = v_isSharedCheck_1875_;
goto v_resetjp_1813_;
}
v_resetjp_1813_:
{
lean_object* v___x_1816_; lean_object* v___x_1817_; lean_object* v_result_1819_; lean_object* v_charges_1820_; lean_object* v_result_1823_; lean_object* v___x_1824_; 
v___x_1816_ = lean_unsigned_to_nat(0u);
lean_inc_ref(v_value_1773_);
v___x_1817_ = lp_algalVerification_Algal_Expr_asList(v_value_1773_, v___x_1816_, v_a_1812_);
v_result_1823_ = lean_ctor_get(v___x_1817_, 0);
lean_inc_ref(v_result_1823_);
lean_dec_ref(v___x_1817_);
v___x_1824_ = lean_box(0);
if (lean_obj_tag(v_result_1823_) == 0)
{
lean_object* v_a_1825_; lean_object* v___x_1827_; uint8_t v_isShared_1828_; uint8_t v_isSharedCheck_1832_; 
lean_del_object(v___x_1814_);
lean_dec(v_scope_1777_);
lean_dec_ref(v_value_1773_);
v_a_1825_ = lean_ctor_get(v_result_1823_, 0);
v_isSharedCheck_1832_ = !lean_is_exclusive(v_result_1823_);
if (v_isSharedCheck_1832_ == 0)
{
v___x_1827_ = v_result_1823_;
v_isShared_1828_ = v_isSharedCheck_1832_;
goto v_resetjp_1826_;
}
else
{
lean_inc(v_a_1825_);
lean_dec(v_result_1823_);
v___x_1827_ = lean_box(0);
v_isShared_1828_ = v_isSharedCheck_1832_;
goto v_resetjp_1826_;
}
v_resetjp_1826_:
{
lean_object* v___x_1830_; 
if (v_isShared_1828_ == 0)
{
v___x_1830_ = v___x_1827_;
goto v_reusejp_1829_;
}
else
{
lean_object* v_reuseFailAlloc_1831_; 
v_reuseFailAlloc_1831_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1831_, 0, v_a_1825_);
v___x_1830_ = v_reuseFailAlloc_1831_;
goto v_reusejp_1829_;
}
v_reusejp_1829_:
{
v_result_1790_ = v___x_1830_;
v_charges_1791_ = v___x_1824_;
goto v___jp_1789_;
}
}
}
else
{
lean_object* v_a_1833_; lean_object* v___x_1835_; 
v_a_1833_ = lean_ctor_get(v_result_1823_, 0);
lean_inc(v_a_1833_);
lean_dec_ref_known(v_result_1823_, 1);
lean_inc(v_value_1786_);
if (v_isShared_1815_ == 0)
{
lean_ctor_set_tag(v___x_1814_, 0);
lean_ctor_set(v___x_1814_, 0, v_value_1786_);
v___x_1835_ = v___x_1814_;
goto v_reusejp_1834_;
}
else
{
lean_object* v_reuseFailAlloc_1874_; 
v_reuseFailAlloc_1874_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1874_, 0, v_value_1786_);
v___x_1835_ = v_reuseFailAlloc_1874_;
goto v_reusejp_1834_;
}
v_reusejp_1834_:
{
lean_object* v___x_1836_; lean_object* v_result_1838_; lean_object* v_charges_1839_; lean_object* v_result_1842_; 
v___x_1836_ = lp_algalVerification_Algal_Expr_machine(v_env_1776_, v_scope_1777_, v___x_1835_);
v_result_1842_ = lean_ctor_get(v___x_1836_, 0);
lean_inc_ref(v_result_1842_);
if (lean_obj_tag(v_result_1842_) == 0)
{
lean_object* v_charges_1843_; 
lean_dec(v_a_1833_);
lean_dec_ref(v_value_1773_);
v_charges_1843_ = lean_ctor_get(v___x_1836_, 1);
lean_inc(v_charges_1843_);
lean_dec_ref(v___x_1836_);
v_result_1819_ = v_result_1842_;
v_charges_1820_ = v_charges_1843_;
goto v___jp_1818_;
}
else
{
lean_object* v_a_1844_; lean_object* v___x_1846_; uint8_t v_isShared_1847_; uint8_t v_isSharedCheck_1873_; 
v_a_1844_ = lean_ctor_get(v_result_1842_, 0);
v_isSharedCheck_1873_ = !lean_is_exclusive(v_result_1842_);
if (v_isSharedCheck_1873_ == 0)
{
v___x_1846_ = v_result_1842_;
v_isShared_1847_ = v_isSharedCheck_1873_;
goto v_resetjp_1845_;
}
else
{
lean_inc(v_a_1844_);
lean_dec(v_result_1842_);
v___x_1846_ = lean_box(0);
v_isShared_1847_ = v_isSharedCheck_1873_;
goto v_resetjp_1845_;
}
v_resetjp_1845_:
{
lean_object* v___x_1848_; lean_object* v___x_1849_; lean_object* v___y_1851_; lean_object* v_result_1857_; 
v___x_1848_ = lean_unsigned_to_nat(1u);
lean_inc_ref(v_value_1773_);
v___x_1849_ = lp_algalVerification_Algal_Expr_asIndex(v_value_1773_, v___x_1848_, v_a_1844_);
lean_dec(v_a_1844_);
v_result_1857_ = lean_ctor_get(v___x_1849_, 0);
lean_inc_ref(v_result_1857_);
lean_dec_ref(v___x_1849_);
if (lean_obj_tag(v_result_1857_) == 0)
{
lean_object* v_a_1858_; lean_object* v___x_1860_; uint8_t v_isShared_1861_; uint8_t v_isSharedCheck_1865_; 
lean_del_object(v___x_1846_);
lean_dec(v_a_1833_);
lean_dec_ref(v_value_1773_);
v_a_1858_ = lean_ctor_get(v_result_1857_, 0);
v_isSharedCheck_1865_ = !lean_is_exclusive(v_result_1857_);
if (v_isSharedCheck_1865_ == 0)
{
v___x_1860_ = v_result_1857_;
v_isShared_1861_ = v_isSharedCheck_1865_;
goto v_resetjp_1859_;
}
else
{
lean_inc(v_a_1858_);
lean_dec(v_result_1857_);
v___x_1860_ = lean_box(0);
v_isShared_1861_ = v_isSharedCheck_1865_;
goto v_resetjp_1859_;
}
v_resetjp_1859_:
{
lean_object* v___x_1863_; 
if (v_isShared_1861_ == 0)
{
v___x_1863_ = v___x_1860_;
goto v_reusejp_1862_;
}
else
{
lean_object* v_reuseFailAlloc_1864_; 
v_reuseFailAlloc_1864_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1864_, 0, v_a_1858_);
v___x_1863_ = v_reuseFailAlloc_1864_;
goto v_reusejp_1862_;
}
v_reusejp_1862_:
{
v_result_1838_ = v___x_1863_;
v_charges_1839_ = v___x_1824_;
goto v___jp_1837_;
}
}
}
else
{
lean_object* v_a_1866_; lean_object* v___x_1867_; uint8_t v___x_1868_; 
v_a_1866_ = lean_ctor_get(v_result_1857_, 0);
lean_inc(v_a_1866_);
lean_dec_ref_known(v_result_1857_, 1);
v___x_1867_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__12___closed__0));
v___x_1868_ = lean_string_dec_eq(v_value_1773_, v___x_1867_);
lean_dec_ref(v_value_1773_);
if (v___x_1868_ == 0)
{
double v___x_1869_; lean_object* v___x_1870_; 
v___x_1869_ = lean_unbox_float(v_a_1866_);
lean_dec(v_a_1866_);
v___x_1870_ = lp_algalVerification_Algal_Expr_itemsDropF(v_a_1833_, v___x_1869_);
lean_dec(v_a_1833_);
v___y_1851_ = v___x_1870_;
goto v___jp_1850_;
}
else
{
double v___x_1871_; lean_object* v___x_1872_; 
v___x_1871_ = lean_unbox_float(v_a_1866_);
lean_dec(v_a_1866_);
v___x_1872_ = lp_algalVerification_Algal_Expr_itemsTakeF(v_a_1833_, v___x_1871_);
v___y_1851_ = v___x_1872_;
goto v___jp_1850_;
}
}
v___jp_1850_:
{
lean_object* v___x_1852_; lean_object* v___x_1854_; 
v___x_1852_ = lean_alloc_ctor(4, 1, 0);
lean_ctor_set(v___x_1852_, 0, v___y_1851_);
if (v_isShared_1847_ == 0)
{
lean_ctor_set(v___x_1846_, 0, v___x_1852_);
v___x_1854_ = v___x_1846_;
goto v_reusejp_1853_;
}
else
{
lean_object* v_reuseFailAlloc_1856_; 
v_reuseFailAlloc_1856_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1856_, 0, v___x_1852_);
v___x_1854_ = v_reuseFailAlloc_1856_;
goto v_reusejp_1853_;
}
v_reusejp_1853_:
{
lean_object* v___x_1855_; 
v___x_1855_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__4___closed__1, &lp_algalVerification_Algal_Expr_machine___lam__4___closed__1_once, _init_lp_algalVerification_Algal_Expr_machine___lam__4___closed__1);
v_result_1838_ = v___x_1854_;
v_charges_1839_ = v___x_1855_;
goto v___jp_1837_;
}
}
}
}
v___jp_1837_:
{
lean_object* v_charges_1840_; lean_object* v___x_1841_; 
v_charges_1840_ = lean_ctor_get(v___x_1836_, 1);
lean_inc(v_charges_1840_);
lean_dec_ref(v___x_1836_);
v___x_1841_ = l_List_appendTR___redArg(v_charges_1840_, v_charges_1839_);
v_result_1819_ = v_result_1838_;
v_charges_1820_ = v___x_1841_;
goto v___jp_1818_;
}
}
}
v___jp_1818_:
{
lean_object* v___x_1821_; lean_object* v___x_1822_; 
v___x_1821_ = lean_box(0);
v___x_1822_ = l_List_appendTR___redArg(v___x_1821_, v_charges_1820_);
v_result_1790_ = v_result_1819_;
v_charges_1791_ = v___x_1822_;
goto v___jp_1789_;
}
}
}
v___jp_1789_:
{
lean_object* v_charges_1792_; lean_object* v___x_1794_; uint8_t v_isShared_1795_; uint8_t v_isSharedCheck_1800_; 
v_charges_1792_ = lean_ctor_get(v___x_1788_, 1);
v_isSharedCheck_1800_ = !lean_is_exclusive(v___x_1788_);
if (v_isSharedCheck_1800_ == 0)
{
lean_object* v_unused_1801_; 
v_unused_1801_ = lean_ctor_get(v___x_1788_, 0);
lean_dec(v_unused_1801_);
v___x_1794_ = v___x_1788_;
v_isShared_1795_ = v_isSharedCheck_1800_;
goto v_resetjp_1793_;
}
else
{
lean_inc(v_charges_1792_);
lean_dec(v___x_1788_);
v___x_1794_ = lean_box(0);
v_isShared_1795_ = v_isSharedCheck_1800_;
goto v_resetjp_1793_;
}
v_resetjp_1793_:
{
lean_object* v___x_1796_; lean_object* v___x_1798_; 
v___x_1796_ = l_List_appendTR___redArg(v_charges_1792_, v_charges_1791_);
if (v_isShared_1795_ == 0)
{
lean_ctor_set(v___x_1794_, 1, v___x_1796_);
lean_ctor_set(v___x_1794_, 0, v_result_1790_);
v___x_1798_ = v___x_1794_;
goto v_reusejp_1797_;
}
else
{
lean_object* v_reuseFailAlloc_1799_; 
v_reuseFailAlloc_1799_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1799_, 0, v_result_1790_);
lean_ctor_set(v_reuseFailAlloc_1799_, 1, v___x_1796_);
v___x_1798_ = v_reuseFailAlloc_1799_;
goto v_reusejp_1797_;
}
v_reusejp_1797_:
{
return v___x_1798_;
}
}
}
}
else
{
lean_dec(v_scope_1777_);
goto v___jp_1779_;
}
}
else
{
lean_dec(v_scope_1777_);
goto v___jp_1779_;
}
}
else
{
lean_dec(v_scope_1777_);
goto v___jp_1779_;
}
v___jp_1779_:
{
lean_object* v___x_1780_; lean_object* v___x_1781_; lean_object* v___x_1782_; 
v___x_1780_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__18___closed__0));
v___x_1781_ = lp_algalVerification_Algal_Expr_errArity(v_value_1773_, v___x_1780_, v___x_1774_);
v___x_1782_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_1781_);
return v___x_1782_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__11(lean_object* v_value_1876_, lean_object* v___x_1877_, lean_object* v_rest_1878_, lean_object* v_env_1879_, lean_object* v_scope_1880_, lean_object* v_00___1881_){
_start:
{
if (lean_obj_tag(v_rest_1878_) == 1)
{
lean_object* v_rest_1886_; 
v_rest_1886_ = lean_ctor_get(v_rest_1878_, 1);
if (lean_obj_tag(v_rest_1886_) == 1)
{
lean_object* v_rest_1887_; 
v_rest_1887_ = lean_ctor_get(v_rest_1886_, 1);
if (lean_obj_tag(v_rest_1887_) == 1)
{
lean_object* v_rest_1888_; 
v_rest_1888_ = lean_ctor_get(v_rest_1887_, 1);
if (lean_obj_tag(v_rest_1888_) == 0)
{
lean_object* v_value_1889_; lean_object* v_value_1890_; lean_object* v_value_1891_; lean_object* v___x_1892_; lean_object* v___x_1893_; lean_object* v_result_1895_; lean_object* v_charges_1896_; lean_object* v_result_1907_; 
lean_dec(v___x_1877_);
v_value_1889_ = lean_ctor_get(v_rest_1878_, 0);
v_value_1890_ = lean_ctor_get(v_rest_1886_, 0);
v_value_1891_ = lean_ctor_get(v_rest_1887_, 0);
lean_inc(v_value_1889_);
v___x_1892_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_1892_, 0, v_value_1889_);
lean_inc(v_scope_1880_);
v___x_1893_ = lp_algalVerification_Algal_Expr_machine(v_env_1879_, v_scope_1880_, v___x_1892_);
v_result_1907_ = lean_ctor_get(v___x_1893_, 0);
lean_inc_ref(v_result_1907_);
if (lean_obj_tag(v_result_1907_) == 0)
{
lean_object* v_charges_1908_; lean_object* v___x_1910_; uint8_t v_isShared_1911_; uint8_t v_isSharedCheck_1915_; 
lean_dec(v_scope_1880_);
lean_dec_ref(v_value_1876_);
v_charges_1908_ = lean_ctor_get(v___x_1893_, 1);
v_isSharedCheck_1915_ = !lean_is_exclusive(v___x_1893_);
if (v_isSharedCheck_1915_ == 0)
{
lean_object* v_unused_1916_; 
v_unused_1916_ = lean_ctor_get(v___x_1893_, 0);
lean_dec(v_unused_1916_);
v___x_1910_ = v___x_1893_;
v_isShared_1911_ = v_isSharedCheck_1915_;
goto v_resetjp_1909_;
}
else
{
lean_inc(v_charges_1908_);
lean_dec(v___x_1893_);
v___x_1910_ = lean_box(0);
v_isShared_1911_ = v_isSharedCheck_1915_;
goto v_resetjp_1909_;
}
v_resetjp_1909_:
{
lean_object* v___x_1913_; 
if (v_isShared_1911_ == 0)
{
v___x_1913_ = v___x_1910_;
goto v_reusejp_1912_;
}
else
{
lean_object* v_reuseFailAlloc_1914_; 
v_reuseFailAlloc_1914_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1914_, 0, v_result_1907_);
lean_ctor_set(v_reuseFailAlloc_1914_, 1, v_charges_1908_);
v___x_1913_ = v_reuseFailAlloc_1914_;
goto v_reusejp_1912_;
}
v_reusejp_1912_:
{
return v___x_1913_;
}
}
}
else
{
lean_object* v_a_1917_; lean_object* v___x_1918_; lean_object* v___x_1919_; lean_object* v_result_1920_; lean_object* v___x_1921_; 
v_a_1917_ = lean_ctor_get(v_result_1907_, 0);
lean_inc(v_a_1917_);
lean_dec_ref_known(v_result_1907_, 1);
v___x_1918_ = lean_unsigned_to_nat(0u);
lean_inc_ref(v_value_1876_);
v___x_1919_ = lp_algalVerification_Algal_Expr_asList(v_value_1876_, v___x_1918_, v_a_1917_);
v_result_1920_ = lean_ctor_get(v___x_1919_, 0);
lean_inc_ref(v_result_1920_);
lean_dec_ref(v___x_1919_);
v___x_1921_ = lean_box(0);
if (lean_obj_tag(v_result_1920_) == 0)
{
lean_object* v_a_1922_; lean_object* v___x_1924_; uint8_t v_isShared_1925_; uint8_t v_isSharedCheck_1929_; 
lean_dec(v_scope_1880_);
lean_dec_ref(v_value_1876_);
v_a_1922_ = lean_ctor_get(v_result_1920_, 0);
v_isSharedCheck_1929_ = !lean_is_exclusive(v_result_1920_);
if (v_isSharedCheck_1929_ == 0)
{
v___x_1924_ = v_result_1920_;
v_isShared_1925_ = v_isSharedCheck_1929_;
goto v_resetjp_1923_;
}
else
{
lean_inc(v_a_1922_);
lean_dec(v_result_1920_);
v___x_1924_ = lean_box(0);
v_isShared_1925_ = v_isSharedCheck_1929_;
goto v_resetjp_1923_;
}
v_resetjp_1923_:
{
lean_object* v___x_1927_; 
if (v_isShared_1925_ == 0)
{
v___x_1927_ = v___x_1924_;
goto v_reusejp_1926_;
}
else
{
lean_object* v_reuseFailAlloc_1928_; 
v_reuseFailAlloc_1928_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1928_, 0, v_a_1922_);
v___x_1927_ = v_reuseFailAlloc_1928_;
goto v_reusejp_1926_;
}
v_reusejp_1926_:
{
v_result_1895_ = v___x_1927_;
v_charges_1896_ = v___x_1921_;
goto v___jp_1894_;
}
}
}
else
{
lean_object* v_a_1930_; lean_object* v___x_1931_; lean_object* v___x_1932_; uint8_t v___x_1933_; lean_object* v___x_1934_; lean_object* v___x_1935_; lean_object* v___x_1936_; lean_object* v_result_1937_; lean_object* v_charges_1938_; lean_object* v___x_1939_; 
v_a_1930_ = lean_ctor_get(v_result_1920_, 0);
lean_inc(v_a_1930_);
lean_dec_ref_known(v_result_1920_, 1);
v___x_1931_ = lp_algalVerification_Algal_Expr_binderName(v_value_1890_);
v___x_1932_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asMap___closed__0));
v___x_1933_ = lean_string_dec_eq(v_value_1876_, v___x_1932_);
v___x_1934_ = lean_unsigned_to_nat(2u);
lean_inc(v_value_1891_);
v___x_1935_ = lean_alloc_ctor(5, 7, 1);
lean_ctor_set(v___x_1935_, 0, v_value_1876_);
lean_ctor_set(v___x_1935_, 1, v___x_1931_);
lean_ctor_set(v___x_1935_, 2, v_value_1891_);
lean_ctor_set(v___x_1935_, 3, v_a_1930_);
lean_ctor_set(v___x_1935_, 4, v_rest_1888_);
lean_ctor_set(v___x_1935_, 5, v___x_1934_);
lean_ctor_set(v___x_1935_, 6, v___x_1918_);
lean_ctor_set_uint8(v___x_1935_, sizeof(void*)*7, v___x_1933_);
v___x_1936_ = lp_algalVerification_Algal_Expr_machine(v_env_1879_, v_scope_1880_, v___x_1935_);
v_result_1937_ = lean_ctor_get(v___x_1936_, 0);
lean_inc_ref(v_result_1937_);
v_charges_1938_ = lean_ctor_get(v___x_1936_, 1);
lean_inc(v_charges_1938_);
lean_dec_ref(v___x_1936_);
v___x_1939_ = l_List_appendTR___redArg(v___x_1921_, v_charges_1938_);
v_result_1895_ = v_result_1937_;
v_charges_1896_ = v___x_1939_;
goto v___jp_1894_;
}
}
v___jp_1894_:
{
lean_object* v_charges_1897_; lean_object* v___x_1899_; uint8_t v_isShared_1900_; uint8_t v_isSharedCheck_1905_; 
v_charges_1897_ = lean_ctor_get(v___x_1893_, 1);
v_isSharedCheck_1905_ = !lean_is_exclusive(v___x_1893_);
if (v_isSharedCheck_1905_ == 0)
{
lean_object* v_unused_1906_; 
v_unused_1906_ = lean_ctor_get(v___x_1893_, 0);
lean_dec(v_unused_1906_);
v___x_1899_ = v___x_1893_;
v_isShared_1900_ = v_isSharedCheck_1905_;
goto v_resetjp_1898_;
}
else
{
lean_inc(v_charges_1897_);
lean_dec(v___x_1893_);
v___x_1899_ = lean_box(0);
v_isShared_1900_ = v_isSharedCheck_1905_;
goto v_resetjp_1898_;
}
v_resetjp_1898_:
{
lean_object* v___x_1901_; lean_object* v___x_1903_; 
v___x_1901_ = l_List_appendTR___redArg(v_charges_1897_, v_charges_1896_);
if (v_isShared_1900_ == 0)
{
lean_ctor_set(v___x_1899_, 1, v___x_1901_);
lean_ctor_set(v___x_1899_, 0, v_result_1895_);
v___x_1903_ = v___x_1899_;
goto v_reusejp_1902_;
}
else
{
lean_object* v_reuseFailAlloc_1904_; 
v_reuseFailAlloc_1904_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1904_, 0, v_result_1895_);
lean_ctor_set(v_reuseFailAlloc_1904_, 1, v___x_1901_);
v___x_1903_ = v_reuseFailAlloc_1904_;
goto v_reusejp_1902_;
}
v_reusejp_1902_:
{
return v___x_1903_;
}
}
}
}
else
{
lean_dec(v_scope_1880_);
goto v___jp_1882_;
}
}
else
{
lean_dec(v_scope_1880_);
goto v___jp_1882_;
}
}
else
{
lean_dec(v_scope_1880_);
goto v___jp_1882_;
}
}
else
{
lean_dec(v_scope_1880_);
goto v___jp_1882_;
}
v___jp_1882_:
{
lean_object* v___x_1883_; lean_object* v___x_1884_; lean_object* v___x_1885_; 
v___x_1883_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__21___closed__0));
v___x_1884_ = lp_algalVerification_Algal_Expr_errArity(v_value_1876_, v___x_1883_, v___x_1877_);
v___x_1885_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_1884_);
return v___x_1885_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__10(lean_object* v_value_1945_, lean_object* v_rest_1946_, lean_object* v_env_1947_, lean_object* v_scope_1948_, lean_object* v___f_1949_, lean_object* v_00___1950_){
_start:
{
lean_object* v___x_1951_; lean_object* v___x_1952_; lean_object* v___x_1953_; lean_object* v_result_1955_; lean_object* v_charges_1956_; lean_object* v_result_1968_; lean_object* v___x_1969_; 
v___x_1951_ = lean_unsigned_to_nat(2u);
v___x_1952_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__10___closed__0));
lean_inc_ref(v_value_1945_);
v___x_1953_ = lp_algalVerification_Algal_Expr_checkArity(v_value_1945_, v_rest_1946_, v___x_1951_, v___x_1952_);
v_result_1968_ = lean_ctor_get(v___x_1953_, 0);
lean_inc_ref(v_result_1968_);
v___x_1969_ = lean_box(0);
if (lean_obj_tag(v_result_1968_) == 0)
{
lean_object* v___x_1971_; uint8_t v_isShared_1972_; uint8_t v_isSharedCheck_1984_; 
lean_dec_ref(v___f_1949_);
lean_dec(v_scope_1948_);
lean_dec(v_rest_1946_);
lean_dec_ref(v_value_1945_);
v_isSharedCheck_1984_ = !lean_is_exclusive(v___x_1953_);
if (v_isSharedCheck_1984_ == 0)
{
lean_object* v_unused_1985_; lean_object* v_unused_1986_; 
v_unused_1985_ = lean_ctor_get(v___x_1953_, 1);
lean_dec(v_unused_1985_);
v_unused_1986_ = lean_ctor_get(v___x_1953_, 0);
lean_dec(v_unused_1986_);
v___x_1971_ = v___x_1953_;
v_isShared_1972_ = v_isSharedCheck_1984_;
goto v_resetjp_1970_;
}
else
{
lean_dec(v___x_1953_);
v___x_1971_ = lean_box(0);
v_isShared_1972_ = v_isSharedCheck_1984_;
goto v_resetjp_1970_;
}
v_resetjp_1970_:
{
lean_object* v_a_1973_; lean_object* v___x_1975_; uint8_t v_isShared_1976_; uint8_t v_isSharedCheck_1983_; 
v_a_1973_ = lean_ctor_get(v_result_1968_, 0);
v_isSharedCheck_1983_ = !lean_is_exclusive(v_result_1968_);
if (v_isSharedCheck_1983_ == 0)
{
v___x_1975_ = v_result_1968_;
v_isShared_1976_ = v_isSharedCheck_1983_;
goto v_resetjp_1974_;
}
else
{
lean_inc(v_a_1973_);
lean_dec(v_result_1968_);
v___x_1975_ = lean_box(0);
v_isShared_1976_ = v_isSharedCheck_1983_;
goto v_resetjp_1974_;
}
v_resetjp_1974_:
{
lean_object* v___x_1978_; 
if (v_isShared_1976_ == 0)
{
v___x_1978_ = v___x_1975_;
goto v_reusejp_1977_;
}
else
{
lean_object* v_reuseFailAlloc_1982_; 
v_reuseFailAlloc_1982_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1982_, 0, v_a_1973_);
v___x_1978_ = v_reuseFailAlloc_1982_;
goto v_reusejp_1977_;
}
v_reusejp_1977_:
{
lean_object* v___x_1980_; 
if (v_isShared_1972_ == 0)
{
lean_ctor_set(v___x_1971_, 1, v___x_1969_);
lean_ctor_set(v___x_1971_, 0, v___x_1978_);
v___x_1980_ = v___x_1971_;
goto v_reusejp_1979_;
}
else
{
lean_object* v_reuseFailAlloc_1981_; 
v_reuseFailAlloc_1981_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1981_, 0, v___x_1978_);
lean_ctor_set(v_reuseFailAlloc_1981_, 1, v___x_1969_);
v___x_1980_ = v_reuseFailAlloc_1981_;
goto v_reusejp_1979_;
}
v_reusejp_1979_:
{
return v___x_1980_;
}
}
}
}
}
else
{
lean_object* v___x_1987_; lean_object* v___x_1988_; lean_object* v___x_1989_; lean_object* v_result_1991_; lean_object* v_charges_1992_; lean_object* v___y_1996_; lean_object* v_result_1999_; 
lean_dec_ref_known(v_result_1968_, 1);
v___x_1987_ = lean_box(0);
v___x_1988_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v___x_1988_, 0, v_rest_1946_);
lean_ctor_set(v___x_1988_, 1, v___x_1987_);
lean_ctor_set(v___x_1988_, 2, v___x_1951_);
v___x_1989_ = lp_algalVerification_Algal_Expr_machine(v_env_1947_, v_scope_1948_, v___x_1988_);
v_result_1999_ = lean_ctor_get(v___x_1989_, 0);
lean_inc_ref(v_result_1999_);
if (lean_obj_tag(v_result_1999_) == 0)
{
lean_object* v_charges_2000_; 
lean_dec_ref(v___f_1949_);
lean_dec_ref(v_value_1945_);
v_charges_2000_ = lean_ctor_get(v___x_1989_, 1);
lean_inc(v_charges_2000_);
lean_dec_ref(v___x_1989_);
v_result_1955_ = v_result_1999_;
v_charges_1956_ = v_charges_2000_;
goto v___jp_1954_;
}
else
{
lean_object* v_a_2001_; lean_object* v___x_2003_; uint8_t v_isShared_2004_; uint8_t v_isSharedCheck_2031_; 
v_a_2001_ = lean_ctor_get(v_result_1999_, 0);
v_isSharedCheck_2031_ = !lean_is_exclusive(v_result_1999_);
if (v_isSharedCheck_2031_ == 0)
{
v___x_2003_ = v_result_1999_;
v_isShared_2004_ = v_isSharedCheck_2031_;
goto v_resetjp_2002_;
}
else
{
lean_inc(v_a_2001_);
lean_dec(v_result_1999_);
v___x_2003_ = lean_box(0);
v_isShared_2004_ = v_isSharedCheck_2031_;
goto v_resetjp_2002_;
}
v_resetjp_2002_:
{
if (lean_obj_tag(v_a_2001_) == 4)
{
lean_object* v_values_2005_; 
v_values_2005_ = lean_ctor_get(v_a_2001_, 0);
if (lean_obj_tag(v_values_2005_) == 1)
{
lean_object* v_rest_2006_; 
v_rest_2006_ = lean_ctor_get(v_values_2005_, 1);
if (lean_obj_tag(v_rest_2006_) == 1)
{
lean_object* v_rest_2007_; 
v_rest_2007_ = lean_ctor_get(v_rest_2006_, 1);
if (lean_obj_tag(v_rest_2007_) == 0)
{
lean_object* v_value_2008_; lean_object* v_value_2009_; lean_object* v___x_2010_; lean_object* v___x_2011_; lean_object* v___x_2012_; lean_object* v___x_2013_; uint8_t v___y_2015_; lean_object* v___x_2022_; uint8_t v___x_2023_; 
lean_inc_ref(v_rest_2006_);
lean_inc_ref(v_values_2005_);
lean_dec_ref_known(v_a_2001_, 1);
lean_dec_ref(v___f_1949_);
v_value_2008_ = lean_ctor_get(v_values_2005_, 0);
lean_inc(v_value_2008_);
lean_dec_ref_known(v_values_2005_, 2);
v_value_2009_ = lean_ctor_get(v_rest_2006_, 0);
lean_inc(v_value_2009_);
lean_dec_ref_known(v_rest_2006_, 2);
v___x_2010_ = lp_algalVerification_Algal_Expr_countNodes(v_value_2008_);
v___x_2011_ = lp_algalVerification_Algal_Expr_countNodes(v_value_2009_);
v___x_2012_ = lean_nat_add(v___x_2010_, v___x_2011_);
lean_dec(v___x_2011_);
lean_dec(v___x_2010_);
v___x_2013_ = lp_algalVerification_Algal_Expr_charge(v___x_2012_);
v___x_2022_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__10___closed__1));
v___x_2023_ = lean_string_dec_eq(v_value_1945_, v___x_2022_);
lean_dec_ref(v_value_1945_);
if (v___x_2023_ == 0)
{
uint8_t v___x_2024_; 
v___x_2024_ = lp_algalVerification_Algal_Expr_eqv(v_value_2008_, v_value_2009_);
if (v___x_2024_ == 0)
{
uint8_t v___x_2025_; 
v___x_2025_ = 1;
v___y_2015_ = v___x_2025_;
goto v___jp_2014_;
}
else
{
v___y_2015_ = v___x_2023_;
goto v___jp_2014_;
}
}
else
{
uint8_t v___x_2026_; 
v___x_2026_ = lp_algalVerification_Algal_Expr_eqv(v_value_2008_, v_value_2009_);
v___y_2015_ = v___x_2026_;
goto v___jp_2014_;
}
v___jp_2014_:
{
lean_object* v_charges_2016_; lean_object* v___x_2017_; lean_object* v___x_2019_; 
v_charges_2016_ = lean_ctor_get(v___x_2013_, 1);
lean_inc(v_charges_2016_);
lean_dec_ref(v___x_2013_);
v___x_2017_ = lean_alloc_ctor(1, 0, 1);
lean_ctor_set_uint8(v___x_2017_, 0, v___y_2015_);
if (v_isShared_2004_ == 0)
{
lean_ctor_set(v___x_2003_, 0, v___x_2017_);
v___x_2019_ = v___x_2003_;
goto v_reusejp_2018_;
}
else
{
lean_object* v_reuseFailAlloc_2021_; 
v_reuseFailAlloc_2021_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2021_, 0, v___x_2017_);
v___x_2019_ = v_reuseFailAlloc_2021_;
goto v_reusejp_2018_;
}
v_reusejp_2018_:
{
lean_object* v___x_2020_; 
v___x_2020_ = l_List_appendTR___redArg(v_charges_2016_, v___x_1969_);
v_result_1991_ = v___x_2019_;
v_charges_1992_ = v___x_2020_;
goto v___jp_1990_;
}
}
}
else
{
lean_object* v___x_2027_; 
lean_del_object(v___x_2003_);
lean_dec_ref(v_value_1945_);
v___x_2027_ = lean_apply_1(v___f_1949_, v_a_2001_);
v___y_1996_ = v___x_2027_;
goto v___jp_1995_;
}
}
else
{
lean_object* v___x_2028_; 
lean_del_object(v___x_2003_);
lean_dec_ref(v_value_1945_);
v___x_2028_ = lean_apply_1(v___f_1949_, v_a_2001_);
v___y_1996_ = v___x_2028_;
goto v___jp_1995_;
}
}
else
{
lean_object* v___x_2029_; 
lean_del_object(v___x_2003_);
lean_dec_ref(v_value_1945_);
v___x_2029_ = lean_apply_1(v___f_1949_, v_a_2001_);
v___y_1996_ = v___x_2029_;
goto v___jp_1995_;
}
}
else
{
lean_object* v___x_2030_; 
lean_del_object(v___x_2003_);
lean_dec_ref(v_value_1945_);
v___x_2030_ = lean_apply_1(v___f_1949_, v_a_2001_);
v___y_1996_ = v___x_2030_;
goto v___jp_1995_;
}
}
}
v___jp_1990_:
{
lean_object* v_charges_1993_; lean_object* v___x_1994_; 
v_charges_1993_ = lean_ctor_get(v___x_1989_, 1);
lean_inc(v_charges_1993_);
lean_dec_ref(v___x_1989_);
v___x_1994_ = l_List_appendTR___redArg(v_charges_1993_, v_charges_1992_);
v_result_1955_ = v_result_1991_;
v_charges_1956_ = v___x_1994_;
goto v___jp_1954_;
}
v___jp_1995_:
{
lean_object* v_result_1997_; lean_object* v_charges_1998_; 
v_result_1997_ = lean_ctor_get(v___y_1996_, 0);
lean_inc_ref(v_result_1997_);
v_charges_1998_ = lean_ctor_get(v___y_1996_, 1);
lean_inc(v_charges_1998_);
lean_dec_ref(v___y_1996_);
v_result_1991_ = v_result_1997_;
v_charges_1992_ = v_charges_1998_;
goto v___jp_1990_;
}
}
v___jp_1954_:
{
lean_object* v___x_1958_; uint8_t v_isShared_1959_; uint8_t v_isSharedCheck_1965_; 
v_isSharedCheck_1965_ = !lean_is_exclusive(v___x_1953_);
if (v_isSharedCheck_1965_ == 0)
{
lean_object* v_unused_1966_; lean_object* v_unused_1967_; 
v_unused_1966_ = lean_ctor_get(v___x_1953_, 1);
lean_dec(v_unused_1966_);
v_unused_1967_ = lean_ctor_get(v___x_1953_, 0);
lean_dec(v_unused_1967_);
v___x_1958_ = v___x_1953_;
v_isShared_1959_ = v_isSharedCheck_1965_;
goto v_resetjp_1957_;
}
else
{
lean_dec(v___x_1953_);
v___x_1958_ = lean_box(0);
v_isShared_1959_ = v_isSharedCheck_1965_;
goto v_resetjp_1957_;
}
v_resetjp_1957_:
{
lean_object* v___x_1960_; lean_object* v___x_1961_; lean_object* v___x_1963_; 
v___x_1960_ = lean_box(0);
v___x_1961_ = l_List_appendTR___redArg(v___x_1960_, v_charges_1956_);
if (v_isShared_1959_ == 0)
{
lean_ctor_set(v___x_1958_, 1, v___x_1961_);
lean_ctor_set(v___x_1958_, 0, v_result_1955_);
v___x_1963_ = v___x_1958_;
goto v_reusejp_1962_;
}
else
{
lean_object* v_reuseFailAlloc_1964_; 
v_reuseFailAlloc_1964_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1964_, 0, v_result_1955_);
lean_ctor_set(v_reuseFailAlloc_1964_, 1, v___x_1961_);
v___x_1963_ = v_reuseFailAlloc_1964_;
goto v_reusejp_1962_;
}
v_reusejp_1962_:
{
return v___x_1963_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__8(lean_object* v_value_2032_, lean_object* v_rest_2033_, lean_object* v_env_2034_, lean_object* v_scope_2035_, lean_object* v___f_2036_, lean_object* v_00___2037_){
_start:
{
lean_object* v___x_2038_; lean_object* v___x_2039_; lean_object* v___x_2040_; lean_object* v_result_2042_; lean_object* v_charges_2043_; lean_object* v_result_2055_; lean_object* v___x_2056_; 
v___x_2038_ = lean_unsigned_to_nat(2u);
v___x_2039_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__10___closed__0));
lean_inc_ref(v_value_2032_);
v___x_2040_ = lp_algalVerification_Algal_Expr_checkArity(v_value_2032_, v_rest_2033_, v___x_2038_, v___x_2039_);
v_result_2055_ = lean_ctor_get(v___x_2040_, 0);
lean_inc_ref(v_result_2055_);
v___x_2056_ = lean_box(0);
if (lean_obj_tag(v_result_2055_) == 0)
{
lean_object* v___x_2058_; uint8_t v_isShared_2059_; uint8_t v_isSharedCheck_2071_; 
lean_dec_ref(v___f_2036_);
lean_dec(v_scope_2035_);
lean_dec(v_rest_2033_);
lean_dec_ref(v_value_2032_);
v_isSharedCheck_2071_ = !lean_is_exclusive(v___x_2040_);
if (v_isSharedCheck_2071_ == 0)
{
lean_object* v_unused_2072_; lean_object* v_unused_2073_; 
v_unused_2072_ = lean_ctor_get(v___x_2040_, 1);
lean_dec(v_unused_2072_);
v_unused_2073_ = lean_ctor_get(v___x_2040_, 0);
lean_dec(v_unused_2073_);
v___x_2058_ = v___x_2040_;
v_isShared_2059_ = v_isSharedCheck_2071_;
goto v_resetjp_2057_;
}
else
{
lean_dec(v___x_2040_);
v___x_2058_ = lean_box(0);
v_isShared_2059_ = v_isSharedCheck_2071_;
goto v_resetjp_2057_;
}
v_resetjp_2057_:
{
lean_object* v_a_2060_; lean_object* v___x_2062_; uint8_t v_isShared_2063_; uint8_t v_isSharedCheck_2070_; 
v_a_2060_ = lean_ctor_get(v_result_2055_, 0);
v_isSharedCheck_2070_ = !lean_is_exclusive(v_result_2055_);
if (v_isSharedCheck_2070_ == 0)
{
v___x_2062_ = v_result_2055_;
v_isShared_2063_ = v_isSharedCheck_2070_;
goto v_resetjp_2061_;
}
else
{
lean_inc(v_a_2060_);
lean_dec(v_result_2055_);
v___x_2062_ = lean_box(0);
v_isShared_2063_ = v_isSharedCheck_2070_;
goto v_resetjp_2061_;
}
v_resetjp_2061_:
{
lean_object* v___x_2065_; 
if (v_isShared_2063_ == 0)
{
v___x_2065_ = v___x_2062_;
goto v_reusejp_2064_;
}
else
{
lean_object* v_reuseFailAlloc_2069_; 
v_reuseFailAlloc_2069_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2069_, 0, v_a_2060_);
v___x_2065_ = v_reuseFailAlloc_2069_;
goto v_reusejp_2064_;
}
v_reusejp_2064_:
{
lean_object* v___x_2067_; 
if (v_isShared_2059_ == 0)
{
lean_ctor_set(v___x_2058_, 1, v___x_2056_);
lean_ctor_set(v___x_2058_, 0, v___x_2065_);
v___x_2067_ = v___x_2058_;
goto v_reusejp_2066_;
}
else
{
lean_object* v_reuseFailAlloc_2068_; 
v_reuseFailAlloc_2068_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2068_, 0, v___x_2065_);
lean_ctor_set(v_reuseFailAlloc_2068_, 1, v___x_2056_);
v___x_2067_ = v_reuseFailAlloc_2068_;
goto v_reusejp_2066_;
}
v_reusejp_2066_:
{
return v___x_2067_;
}
}
}
}
}
else
{
lean_object* v___x_2075_; uint8_t v_isShared_2076_; uint8_t v_isSharedCheck_2145_; 
v_isSharedCheck_2145_ = !lean_is_exclusive(v_result_2055_);
if (v_isSharedCheck_2145_ == 0)
{
lean_object* v_unused_2146_; 
v_unused_2146_ = lean_ctor_get(v_result_2055_, 0);
lean_dec(v_unused_2146_);
v___x_2075_ = v_result_2055_;
v_isShared_2076_ = v_isSharedCheck_2145_;
goto v_resetjp_2074_;
}
else
{
lean_dec(v_result_2055_);
v___x_2075_ = lean_box(0);
v_isShared_2076_ = v_isSharedCheck_2145_;
goto v_resetjp_2074_;
}
v_resetjp_2074_:
{
lean_object* v___x_2077_; lean_object* v___x_2078_; lean_object* v___x_2079_; lean_object* v_result_2081_; lean_object* v_charges_2082_; lean_object* v___y_2086_; uint8_t v___y_2090_; uint8_t v___y_2096_; lean_object* v_result_2099_; 
v___x_2077_ = lean_box(0);
v___x_2078_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v___x_2078_, 0, v_rest_2033_);
lean_ctor_set(v___x_2078_, 1, v___x_2077_);
lean_ctor_set(v___x_2078_, 2, v___x_2038_);
v___x_2079_ = lp_algalVerification_Algal_Expr_machine(v_env_2034_, v_scope_2035_, v___x_2078_);
v_result_2099_ = lean_ctor_get(v___x_2079_, 0);
lean_inc_ref(v_result_2099_);
if (lean_obj_tag(v_result_2099_) == 0)
{
lean_object* v_charges_2100_; 
lean_del_object(v___x_2075_);
lean_dec_ref(v___f_2036_);
lean_dec_ref(v_value_2032_);
v_charges_2100_ = lean_ctor_get(v___x_2079_, 1);
lean_inc(v_charges_2100_);
lean_dec_ref(v___x_2079_);
v_result_2042_ = v_result_2099_;
v_charges_2043_ = v_charges_2100_;
goto v___jp_2041_;
}
else
{
lean_object* v_a_2101_; 
v_a_2101_ = lean_ctor_get(v_result_2099_, 0);
lean_inc(v_a_2101_);
lean_dec_ref_known(v_result_2099_, 1);
if (lean_obj_tag(v_a_2101_) == 4)
{
lean_object* v_values_2102_; 
v_values_2102_ = lean_ctor_get(v_a_2101_, 0);
if (lean_obj_tag(v_values_2102_) == 1)
{
lean_object* v_rest_2103_; 
v_rest_2103_ = lean_ctor_get(v_values_2102_, 1);
if (lean_obj_tag(v_rest_2103_) == 1)
{
lean_object* v_rest_2104_; 
v_rest_2104_ = lean_ctor_get(v_rest_2103_, 1);
if (lean_obj_tag(v_rest_2104_) == 0)
{
lean_object* v_value_2105_; 
lean_inc_ref(v_rest_2103_);
lean_inc_ref(v_values_2102_);
lean_dec_ref_known(v_a_2101_, 1);
lean_dec_ref(v___f_2036_);
v_value_2105_ = lean_ctor_get(v_values_2102_, 0);
lean_inc(v_value_2105_);
lean_dec_ref_known(v_values_2102_, 2);
switch(lean_obj_tag(v_value_2105_))
{
case 2:
{
lean_object* v_value_2106_; 
v_value_2106_ = lean_ctor_get(v_rest_2103_, 0);
lean_inc(v_value_2106_);
lean_dec_ref_known(v_rest_2103_, 2);
if (lean_obj_tag(v_value_2106_) == 2)
{
uint64_t v_value_2107_; uint64_t v_value_2108_; double v___x_2109_; double v___x_2110_; lean_object* v___x_2111_; uint8_t v___x_2112_; 
v_value_2107_ = lean_ctor_get_uint64(v_value_2105_, 0);
lean_dec_ref_known(v_value_2105_, 0);
v_value_2108_ = lean_ctor_get_uint64(v_value_2106_, 0);
lean_dec_ref_known(v_value_2106_, 0);
v___x_2109_ = lean_float_of_bits(v_value_2107_);
v___x_2110_ = lean_float_of_bits(v_value_2108_);
v___x_2111_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__8___closed__0));
v___x_2112_ = lean_string_dec_eq(v_value_2032_, v___x_2111_);
if (v___x_2112_ == 0)
{
lean_object* v___x_2113_; uint8_t v___x_2114_; 
v___x_2113_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__8___closed__1));
v___x_2114_ = lean_string_dec_eq(v_value_2032_, v___x_2113_);
if (v___x_2114_ == 0)
{
lean_object* v___x_2115_; uint8_t v___x_2116_; 
v___x_2115_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__8___closed__2));
v___x_2116_ = lean_string_dec_eq(v_value_2032_, v___x_2115_);
lean_dec_ref(v_value_2032_);
if (v___x_2116_ == 0)
{
uint8_t v___x_2117_; 
v___x_2117_ = lean_float_decLe(v___x_2110_, v___x_2109_);
v___y_2090_ = v___x_2117_;
goto v___jp_2089_;
}
else
{
uint8_t v___x_2118_; 
v___x_2118_ = lean_float_decLt(v___x_2110_, v___x_2109_);
v___y_2090_ = v___x_2118_;
goto v___jp_2089_;
}
}
else
{
uint8_t v___x_2119_; 
lean_dec_ref(v_value_2032_);
v___x_2119_ = lean_float_decLe(v___x_2109_, v___x_2110_);
v___y_2090_ = v___x_2119_;
goto v___jp_2089_;
}
}
else
{
uint8_t v___x_2120_; 
lean_dec_ref(v_value_2032_);
v___x_2120_ = lean_float_decLt(v___x_2109_, v___x_2110_);
v___y_2090_ = v___x_2120_;
goto v___jp_2089_;
}
}
else
{
lean_object* v___x_2121_; 
lean_del_object(v___x_2075_);
v___x_2121_ = lp_algalVerification_Algal_Expr_machine___lam__7(v_value_2105_, v_value_2106_, v_value_2032_, v_value_2105_, v_value_2106_);
lean_dec(v_value_2106_);
lean_dec_ref_known(v_value_2105_, 0);
v___y_2086_ = v___x_2121_;
goto v___jp_2085_;
}
}
case 3:
{
lean_object* v_value_2122_; 
lean_del_object(v___x_2075_);
v_value_2122_ = lean_ctor_get(v_rest_2103_, 0);
lean_inc(v_value_2122_);
lean_dec_ref_known(v_rest_2103_, 2);
if (lean_obj_tag(v_value_2122_) == 3)
{
lean_object* v_value_2123_; lean_object* v_value_2124_; uint8_t v___x_2125_; 
v_value_2123_ = lean_ctor_get(v_value_2105_, 0);
lean_inc_ref(v_value_2123_);
lean_dec_ref_known(v_value_2105_, 1);
v_value_2124_ = lean_ctor_get(v_value_2122_, 0);
lean_inc_ref(v_value_2124_);
lean_dec_ref_known(v_value_2122_, 1);
v___x_2125_ = lp_algalVerification_Algal_Expr_utf16compare(v_value_2123_, v_value_2124_);
switch(v___x_2125_)
{
case 0:
{
lean_object* v___x_2126_; uint8_t v___x_2127_; 
v___x_2126_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__8___closed__0));
v___x_2127_ = lean_string_dec_eq(v_value_2032_, v___x_2126_);
if (v___x_2127_ == 0)
{
lean_object* v___x_2128_; uint8_t v___x_2129_; 
v___x_2128_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__8___closed__1));
v___x_2129_ = lean_string_dec_eq(v_value_2032_, v___x_2128_);
lean_dec_ref(v_value_2032_);
v___y_2096_ = v___x_2129_;
goto v___jp_2095_;
}
else
{
lean_dec_ref(v_value_2032_);
v___y_2096_ = v___x_2127_;
goto v___jp_2095_;
}
}
case 1:
{
lean_object* v___x_2130_; uint8_t v___x_2131_; 
v___x_2130_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__8___closed__1));
v___x_2131_ = lean_string_dec_eq(v_value_2032_, v___x_2130_);
if (v___x_2131_ == 0)
{
lean_object* v___x_2132_; uint8_t v___x_2133_; 
v___x_2132_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__8___closed__3));
v___x_2133_ = lean_string_dec_eq(v_value_2032_, v___x_2132_);
lean_dec_ref(v_value_2032_);
v___y_2096_ = v___x_2133_;
goto v___jp_2095_;
}
else
{
lean_dec_ref(v_value_2032_);
v___y_2096_ = v___x_2131_;
goto v___jp_2095_;
}
}
default: 
{
lean_object* v___x_2134_; uint8_t v___x_2135_; 
v___x_2134_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__8___closed__2));
v___x_2135_ = lean_string_dec_eq(v_value_2032_, v___x_2134_);
if (v___x_2135_ == 0)
{
lean_object* v___x_2136_; uint8_t v___x_2137_; 
v___x_2136_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__8___closed__3));
v___x_2137_ = lean_string_dec_eq(v_value_2032_, v___x_2136_);
lean_dec_ref(v_value_2032_);
v___y_2096_ = v___x_2137_;
goto v___jp_2095_;
}
else
{
lean_dec_ref(v_value_2032_);
v___y_2096_ = v___x_2135_;
goto v___jp_2095_;
}
}
}
}
else
{
lean_object* v___x_2138_; 
v___x_2138_ = lp_algalVerification_Algal_Expr_machine___lam__7(v_value_2105_, v_value_2122_, v_value_2032_, v_value_2105_, v_value_2122_);
lean_dec(v_value_2122_);
lean_dec_ref_known(v_value_2105_, 1);
v___y_2086_ = v___x_2138_;
goto v___jp_2085_;
}
}
default: 
{
lean_object* v_value_2139_; lean_object* v___x_2140_; 
lean_del_object(v___x_2075_);
v_value_2139_ = lean_ctor_get(v_rest_2103_, 0);
lean_inc(v_value_2139_);
lean_dec_ref_known(v_rest_2103_, 2);
v___x_2140_ = lp_algalVerification_Algal_Expr_machine___lam__7(v_value_2105_, v_value_2139_, v_value_2032_, v_value_2105_, v_value_2139_);
lean_dec(v_value_2139_);
lean_dec(v_value_2105_);
v___y_2086_ = v___x_2140_;
goto v___jp_2085_;
}
}
}
else
{
lean_object* v___x_2141_; 
lean_del_object(v___x_2075_);
lean_dec_ref(v_value_2032_);
v___x_2141_ = lean_apply_1(v___f_2036_, v_a_2101_);
v___y_2086_ = v___x_2141_;
goto v___jp_2085_;
}
}
else
{
lean_object* v___x_2142_; 
lean_del_object(v___x_2075_);
lean_dec_ref(v_value_2032_);
v___x_2142_ = lean_apply_1(v___f_2036_, v_a_2101_);
v___y_2086_ = v___x_2142_;
goto v___jp_2085_;
}
}
else
{
lean_object* v___x_2143_; 
lean_del_object(v___x_2075_);
lean_dec_ref(v_value_2032_);
v___x_2143_ = lean_apply_1(v___f_2036_, v_a_2101_);
v___y_2086_ = v___x_2143_;
goto v___jp_2085_;
}
}
else
{
lean_object* v___x_2144_; 
lean_del_object(v___x_2075_);
lean_dec_ref(v_value_2032_);
v___x_2144_ = lean_apply_1(v___f_2036_, v_a_2101_);
v___y_2086_ = v___x_2144_;
goto v___jp_2085_;
}
}
v___jp_2080_:
{
lean_object* v_charges_2083_; lean_object* v___x_2084_; 
v_charges_2083_ = lean_ctor_get(v___x_2079_, 1);
lean_inc(v_charges_2083_);
lean_dec_ref(v___x_2079_);
v___x_2084_ = l_List_appendTR___redArg(v_charges_2083_, v_charges_2082_);
v_result_2042_ = v_result_2081_;
v_charges_2043_ = v___x_2084_;
goto v___jp_2041_;
}
v___jp_2085_:
{
lean_object* v_result_2087_; lean_object* v_charges_2088_; 
v_result_2087_ = lean_ctor_get(v___y_2086_, 0);
lean_inc_ref(v_result_2087_);
v_charges_2088_ = lean_ctor_get(v___y_2086_, 1);
lean_inc(v_charges_2088_);
lean_dec_ref(v___y_2086_);
v_result_2081_ = v_result_2087_;
v_charges_2082_ = v_charges_2088_;
goto v___jp_2080_;
}
v___jp_2089_:
{
lean_object* v___x_2091_; lean_object* v___x_2093_; 
v___x_2091_ = lean_alloc_ctor(1, 0, 1);
lean_ctor_set_uint8(v___x_2091_, 0, v___y_2090_);
if (v_isShared_2076_ == 0)
{
lean_ctor_set(v___x_2075_, 0, v___x_2091_);
v___x_2093_ = v___x_2075_;
goto v_reusejp_2092_;
}
else
{
lean_object* v_reuseFailAlloc_2094_; 
v_reuseFailAlloc_2094_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2094_, 0, v___x_2091_);
v___x_2093_ = v_reuseFailAlloc_2094_;
goto v_reusejp_2092_;
}
v_reusejp_2092_:
{
v_result_2081_ = v___x_2093_;
v_charges_2082_ = v___x_2056_;
goto v___jp_2080_;
}
}
v___jp_2095_:
{
lean_object* v___x_2097_; lean_object* v___x_2098_; 
v___x_2097_ = lean_alloc_ctor(1, 0, 1);
lean_ctor_set_uint8(v___x_2097_, 0, v___y_2096_);
v___x_2098_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_2098_, 0, v___x_2097_);
v_result_2081_ = v___x_2098_;
v_charges_2082_ = v___x_2056_;
goto v___jp_2080_;
}
}
}
v___jp_2041_:
{
lean_object* v___x_2045_; uint8_t v_isShared_2046_; uint8_t v_isSharedCheck_2052_; 
v_isSharedCheck_2052_ = !lean_is_exclusive(v___x_2040_);
if (v_isSharedCheck_2052_ == 0)
{
lean_object* v_unused_2053_; lean_object* v_unused_2054_; 
v_unused_2053_ = lean_ctor_get(v___x_2040_, 1);
lean_dec(v_unused_2053_);
v_unused_2054_ = lean_ctor_get(v___x_2040_, 0);
lean_dec(v_unused_2054_);
v___x_2045_ = v___x_2040_;
v_isShared_2046_ = v_isSharedCheck_2052_;
goto v_resetjp_2044_;
}
else
{
lean_dec(v___x_2040_);
v___x_2045_ = lean_box(0);
v_isShared_2046_ = v_isSharedCheck_2052_;
goto v_resetjp_2044_;
}
v_resetjp_2044_:
{
lean_object* v___x_2047_; lean_object* v___x_2048_; lean_object* v___x_2050_; 
v___x_2047_ = lean_box(0);
v___x_2048_ = l_List_appendTR___redArg(v___x_2047_, v_charges_2043_);
if (v_isShared_2046_ == 0)
{
lean_ctor_set(v___x_2045_, 1, v___x_2048_);
lean_ctor_set(v___x_2045_, 0, v_result_2042_);
v___x_2050_ = v___x_2045_;
goto v_reusejp_2049_;
}
else
{
lean_object* v_reuseFailAlloc_2051_; 
v_reuseFailAlloc_2051_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2051_, 0, v_result_2042_);
lean_ctor_set(v_reuseFailAlloc_2051_, 1, v___x_2048_);
v___x_2050_ = v_reuseFailAlloc_2051_;
goto v_reusejp_2049_;
}
v_reusejp_2049_:
{
return v___x_2050_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__5(lean_object* v_value_2148_, lean_object* v___x_2149_, lean_object* v_rest_2150_, lean_object* v_env_2151_, lean_object* v_scope_2152_, lean_object* v_00___2153_){
_start:
{
if (lean_obj_tag(v_rest_2150_) == 1)
{
lean_object* v_rest_2158_; 
v_rest_2158_ = lean_ctor_get(v_rest_2150_, 1);
if (lean_obj_tag(v_rest_2158_) == 0)
{
lean_object* v_value_2159_; lean_object* v___x_2160_; lean_object* v___x_2161_; lean_object* v_result_2163_; lean_object* v_charges_2164_; lean_object* v_result_2175_; 
lean_dec(v___x_2149_);
v_value_2159_ = lean_ctor_get(v_rest_2150_, 0);
lean_inc(v_value_2159_);
v___x_2160_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_2160_, 0, v_value_2159_);
v___x_2161_ = lp_algalVerification_Algal_Expr_machine(v_env_2151_, v_scope_2152_, v___x_2160_);
v_result_2175_ = lean_ctor_get(v___x_2161_, 0);
lean_inc_ref(v_result_2175_);
if (lean_obj_tag(v_result_2175_) == 0)
{
lean_object* v_charges_2176_; lean_object* v___x_2178_; uint8_t v_isShared_2179_; uint8_t v_isSharedCheck_2183_; 
lean_dec_ref(v_value_2148_);
v_charges_2176_ = lean_ctor_get(v___x_2161_, 1);
v_isSharedCheck_2183_ = !lean_is_exclusive(v___x_2161_);
if (v_isSharedCheck_2183_ == 0)
{
lean_object* v_unused_2184_; 
v_unused_2184_ = lean_ctor_get(v___x_2161_, 0);
lean_dec(v_unused_2184_);
v___x_2178_ = v___x_2161_;
v_isShared_2179_ = v_isSharedCheck_2183_;
goto v_resetjp_2177_;
}
else
{
lean_inc(v_charges_2176_);
lean_dec(v___x_2161_);
v___x_2178_ = lean_box(0);
v_isShared_2179_ = v_isSharedCheck_2183_;
goto v_resetjp_2177_;
}
v_resetjp_2177_:
{
lean_object* v___x_2181_; 
if (v_isShared_2179_ == 0)
{
v___x_2181_ = v___x_2178_;
goto v_reusejp_2180_;
}
else
{
lean_object* v_reuseFailAlloc_2182_; 
v_reuseFailAlloc_2182_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2182_, 0, v_result_2175_);
lean_ctor_set(v_reuseFailAlloc_2182_, 1, v_charges_2176_);
v___x_2181_ = v_reuseFailAlloc_2182_;
goto v_reusejp_2180_;
}
v_reusejp_2180_:
{
return v___x_2181_;
}
}
}
else
{
lean_object* v_a_2185_; lean_object* v___x_2186_; lean_object* v___x_2187_; lean_object* v___y_2189_; lean_object* v_result_2194_; lean_object* v___x_2195_; 
v_a_2185_ = lean_ctor_get(v_result_2175_, 0);
lean_inc(v_a_2185_);
lean_dec_ref_known(v_result_2175_, 1);
v___x_2186_ = lean_unsigned_to_nat(0u);
lean_inc_ref(v_value_2148_);
v___x_2187_ = lp_algalVerification_Algal_Expr_asNum(v_value_2148_, v___x_2186_, v_a_2185_);
lean_dec(v_a_2185_);
v_result_2194_ = lean_ctor_get(v___x_2187_, 0);
lean_inc_ref(v_result_2194_);
lean_dec_ref(v___x_2187_);
v___x_2195_ = lean_box(0);
if (lean_obj_tag(v_result_2194_) == 0)
{
lean_object* v_a_2196_; lean_object* v___x_2198_; uint8_t v_isShared_2199_; uint8_t v_isSharedCheck_2203_; 
lean_dec_ref(v_value_2148_);
v_a_2196_ = lean_ctor_get(v_result_2194_, 0);
v_isSharedCheck_2203_ = !lean_is_exclusive(v_result_2194_);
if (v_isSharedCheck_2203_ == 0)
{
v___x_2198_ = v_result_2194_;
v_isShared_2199_ = v_isSharedCheck_2203_;
goto v_resetjp_2197_;
}
else
{
lean_inc(v_a_2196_);
lean_dec(v_result_2194_);
v___x_2198_ = lean_box(0);
v_isShared_2199_ = v_isSharedCheck_2203_;
goto v_resetjp_2197_;
}
v_resetjp_2197_:
{
lean_object* v___x_2201_; 
if (v_isShared_2199_ == 0)
{
v___x_2201_ = v___x_2198_;
goto v_reusejp_2200_;
}
else
{
lean_object* v_reuseFailAlloc_2202_; 
v_reuseFailAlloc_2202_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2202_, 0, v_a_2196_);
v___x_2201_ = v_reuseFailAlloc_2202_;
goto v_reusejp_2200_;
}
v_reusejp_2200_:
{
v_result_2163_ = v___x_2201_;
v_charges_2164_ = v___x_2195_;
goto v___jp_2162_;
}
}
}
else
{
lean_object* v_a_2204_; lean_object* v___x_2205_; uint8_t v___x_2206_; 
v_a_2204_ = lean_ctor_get(v_result_2194_, 0);
lean_inc(v_a_2204_);
lean_dec_ref_known(v_result_2194_, 1);
v___x_2205_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__5___closed__0));
v___x_2206_ = lean_string_dec_eq(v_value_2148_, v___x_2205_);
if (v___x_2206_ == 0)
{
lean_object* v___x_2207_; uint8_t v___x_2208_; 
v___x_2207_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__5___closed__1));
v___x_2208_ = lean_string_dec_eq(v_value_2148_, v___x_2207_);
if (v___x_2208_ == 0)
{
lean_object* v___x_2209_; uint8_t v___x_2210_; 
v___x_2209_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__5___closed__2));
v___x_2210_ = lean_string_dec_eq(v_value_2148_, v___x_2209_);
if (v___x_2210_ == 0)
{
double v___x_2211_; double v___x_2212_; lean_object* v___x_2213_; 
v___x_2211_ = lean_unbox_float(v_a_2204_);
lean_dec(v_a_2204_);
v___x_2212_ = lp_algalVerification_Algal_Expr_jsRound(v___x_2211_);
v___x_2213_ = lp_algalVerification_Algal_Expr_emitNum(v_value_2148_, v___x_2212_);
v___y_2189_ = v___x_2213_;
goto v___jp_2188_;
}
else
{
double v___x_2214_; double v___x_2215_; lean_object* v___x_2216_; 
v___x_2214_ = lean_unbox_float(v_a_2204_);
lean_dec(v_a_2204_);
v___x_2215_ = ceil(v___x_2214_);
v___x_2216_ = lp_algalVerification_Algal_Expr_emitNum(v_value_2148_, v___x_2215_);
v___y_2189_ = v___x_2216_;
goto v___jp_2188_;
}
}
else
{
double v___x_2217_; double v___x_2218_; lean_object* v___x_2219_; 
v___x_2217_ = lean_unbox_float(v_a_2204_);
lean_dec(v_a_2204_);
v___x_2218_ = floor(v___x_2217_);
v___x_2219_ = lp_algalVerification_Algal_Expr_emitNum(v_value_2148_, v___x_2218_);
v___y_2189_ = v___x_2219_;
goto v___jp_2188_;
}
}
else
{
double v___x_2220_; double v___x_2221_; lean_object* v___x_2222_; 
v___x_2220_ = lean_unbox_float(v_a_2204_);
lean_dec(v_a_2204_);
v___x_2221_ = fabs(v___x_2220_);
v___x_2222_ = lp_algalVerification_Algal_Expr_emitNum(v_value_2148_, v___x_2221_);
v___y_2189_ = v___x_2222_;
goto v___jp_2188_;
}
}
v___jp_2188_:
{
lean_object* v_result_2190_; lean_object* v_charges_2191_; lean_object* v___x_2192_; lean_object* v___x_2193_; 
v_result_2190_ = lean_ctor_get(v___y_2189_, 0);
lean_inc_ref(v_result_2190_);
v_charges_2191_ = lean_ctor_get(v___y_2189_, 1);
lean_inc(v_charges_2191_);
lean_dec_ref(v___y_2189_);
v___x_2192_ = lean_box(0);
v___x_2193_ = l_List_appendTR___redArg(v___x_2192_, v_charges_2191_);
v_result_2163_ = v_result_2190_;
v_charges_2164_ = v___x_2193_;
goto v___jp_2162_;
}
}
v___jp_2162_:
{
lean_object* v_charges_2165_; lean_object* v___x_2167_; uint8_t v_isShared_2168_; uint8_t v_isSharedCheck_2173_; 
v_charges_2165_ = lean_ctor_get(v___x_2161_, 1);
v_isSharedCheck_2173_ = !lean_is_exclusive(v___x_2161_);
if (v_isSharedCheck_2173_ == 0)
{
lean_object* v_unused_2174_; 
v_unused_2174_ = lean_ctor_get(v___x_2161_, 0);
lean_dec(v_unused_2174_);
v___x_2167_ = v___x_2161_;
v_isShared_2168_ = v_isSharedCheck_2173_;
goto v_resetjp_2166_;
}
else
{
lean_inc(v_charges_2165_);
lean_dec(v___x_2161_);
v___x_2167_ = lean_box(0);
v_isShared_2168_ = v_isSharedCheck_2173_;
goto v_resetjp_2166_;
}
v_resetjp_2166_:
{
lean_object* v___x_2169_; lean_object* v___x_2171_; 
v___x_2169_ = l_List_appendTR___redArg(v_charges_2165_, v_charges_2164_);
if (v_isShared_2168_ == 0)
{
lean_ctor_set(v___x_2167_, 1, v___x_2169_);
lean_ctor_set(v___x_2167_, 0, v_result_2163_);
v___x_2171_ = v___x_2167_;
goto v_reusejp_2170_;
}
else
{
lean_object* v_reuseFailAlloc_2172_; 
v_reuseFailAlloc_2172_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2172_, 0, v_result_2163_);
lean_ctor_set(v_reuseFailAlloc_2172_, 1, v___x_2169_);
v___x_2171_ = v_reuseFailAlloc_2172_;
goto v_reusejp_2170_;
}
v_reusejp_2170_:
{
return v___x_2171_;
}
}
}
}
else
{
lean_dec(v_scope_2152_);
goto v___jp_2154_;
}
}
else
{
lean_dec(v_scope_2152_);
goto v___jp_2154_;
}
v___jp_2154_:
{
lean_object* v___x_2155_; lean_object* v___x_2156_; lean_object* v___x_2157_; 
v___x_2155_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__22___closed__0));
v___x_2156_ = lp_algalVerification_Algal_Expr_errArity(v_value_2148_, v___x_2155_, v___x_2149_);
v___x_2157_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_2156_);
return v___x_2157_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__4(lean_object* v_value_2223_, lean_object* v_rest_2224_, lean_object* v_env_2225_, lean_object* v_scope_2226_, lean_object* v_00___2227_){
_start:
{
lean_object* v___x_2228_; lean_object* v___x_2229_; lean_object* v___x_2230_; lean_object* v_result_2232_; lean_object* v_charges_2233_; lean_object* v_result_2245_; lean_object* v___x_2246_; 
v___x_2228_ = lean_unsigned_to_nat(1u);
v___x_2229_ = lean_box(0);
lean_inc_ref(v_value_2223_);
v___x_2230_ = lp_algalVerification_Algal_Expr_checkArity(v_value_2223_, v_rest_2224_, v___x_2228_, v___x_2229_);
v_result_2245_ = lean_ctor_get(v___x_2230_, 0);
lean_inc_ref(v_result_2245_);
v___x_2246_ = lean_box(0);
if (lean_obj_tag(v_result_2245_) == 0)
{
lean_object* v___x_2248_; uint8_t v_isShared_2249_; uint8_t v_isSharedCheck_2261_; 
lean_dec(v_scope_2226_);
lean_dec(v_rest_2224_);
lean_dec_ref(v_value_2223_);
v_isSharedCheck_2261_ = !lean_is_exclusive(v___x_2230_);
if (v_isSharedCheck_2261_ == 0)
{
lean_object* v_unused_2262_; lean_object* v_unused_2263_; 
v_unused_2262_ = lean_ctor_get(v___x_2230_, 1);
lean_dec(v_unused_2262_);
v_unused_2263_ = lean_ctor_get(v___x_2230_, 0);
lean_dec(v_unused_2263_);
v___x_2248_ = v___x_2230_;
v_isShared_2249_ = v_isSharedCheck_2261_;
goto v_resetjp_2247_;
}
else
{
lean_dec(v___x_2230_);
v___x_2248_ = lean_box(0);
v_isShared_2249_ = v_isSharedCheck_2261_;
goto v_resetjp_2247_;
}
v_resetjp_2247_:
{
lean_object* v_a_2250_; lean_object* v___x_2252_; uint8_t v_isShared_2253_; uint8_t v_isSharedCheck_2260_; 
v_a_2250_ = lean_ctor_get(v_result_2245_, 0);
v_isSharedCheck_2260_ = !lean_is_exclusive(v_result_2245_);
if (v_isSharedCheck_2260_ == 0)
{
v___x_2252_ = v_result_2245_;
v_isShared_2253_ = v_isSharedCheck_2260_;
goto v_resetjp_2251_;
}
else
{
lean_inc(v_a_2250_);
lean_dec(v_result_2245_);
v___x_2252_ = lean_box(0);
v_isShared_2253_ = v_isSharedCheck_2260_;
goto v_resetjp_2251_;
}
v_resetjp_2251_:
{
lean_object* v___x_2255_; 
if (v_isShared_2253_ == 0)
{
v___x_2255_ = v___x_2252_;
goto v_reusejp_2254_;
}
else
{
lean_object* v_reuseFailAlloc_2259_; 
v_reuseFailAlloc_2259_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2259_, 0, v_a_2250_);
v___x_2255_ = v_reuseFailAlloc_2259_;
goto v_reusejp_2254_;
}
v_reusejp_2254_:
{
lean_object* v___x_2257_; 
if (v_isShared_2249_ == 0)
{
lean_ctor_set(v___x_2248_, 1, v___x_2246_);
lean_ctor_set(v___x_2248_, 0, v___x_2255_);
v___x_2257_ = v___x_2248_;
goto v_reusejp_2256_;
}
else
{
lean_object* v_reuseFailAlloc_2258_; 
v_reuseFailAlloc_2258_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2258_, 0, v___x_2255_);
lean_ctor_set(v_reuseFailAlloc_2258_, 1, v___x_2246_);
v___x_2257_ = v_reuseFailAlloc_2258_;
goto v_reusejp_2256_;
}
v_reusejp_2256_:
{
return v___x_2257_;
}
}
}
}
}
else
{
lean_object* v___x_2264_; lean_object* v___x_2265_; lean_object* v___x_2266_; lean_object* v___x_2267_; lean_object* v_result_2269_; lean_object* v_charges_2270_; lean_object* v_result_2273_; 
lean_dec_ref_known(v_result_2245_, 1);
v___x_2264_ = lean_box(0);
v___x_2265_ = lean_unsigned_to_nat(2u);
v___x_2266_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v___x_2266_, 0, v_rest_2224_);
lean_ctor_set(v___x_2266_, 1, v___x_2264_);
lean_ctor_set(v___x_2266_, 2, v___x_2265_);
v___x_2267_ = lp_algalVerification_Algal_Expr_machine(v_env_2225_, v_scope_2226_, v___x_2266_);
v_result_2273_ = lean_ctor_get(v___x_2267_, 0);
lean_inc_ref(v_result_2273_);
if (lean_obj_tag(v_result_2273_) == 0)
{
lean_object* v_charges_2274_; 
lean_dec_ref(v_value_2223_);
v_charges_2274_ = lean_ctor_get(v___x_2267_, 1);
lean_inc(v_charges_2274_);
lean_dec_ref(v___x_2267_);
v_result_2232_ = v_result_2273_;
v_charges_2233_ = v_charges_2274_;
goto v___jp_2231_;
}
else
{
lean_object* v_a_2275_; 
v_a_2275_ = lean_ctor_get(v_result_2273_, 0);
lean_inc(v_a_2275_);
lean_dec_ref_known(v_result_2273_, 1);
if (lean_obj_tag(v_a_2275_) == 4)
{
lean_object* v_values_2276_; lean_object* v___x_2277_; uint8_t v___x_2278_; lean_object* v___x_2279_; lean_object* v___y_2280_; lean_object* v___x_2281_; lean_object* v___x_2282_; lean_object* v_result_2283_; 
v_values_2276_ = lean_ctor_get(v_a_2275_, 0);
lean_inc(v_values_2276_);
lean_dec_ref_known(v_a_2275_, 1);
v___x_2277_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__4___closed__0));
v___x_2278_ = lean_string_dec_eq(v_value_2223_, v___x_2277_);
v___x_2279_ = lean_box(v___x_2278_);
v___y_2280_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Expr_machine___lam__3___boxed), 3, 1);
lean_closure_set(v___y_2280_, 0, v___x_2279_);
lean_inc_ref(v_value_2223_);
v___x_2281_ = lp_algalVerification_Algal_Expr_minMaxFold(v_value_2223_, v___y_2280_, v_values_2276_);
lean_dec(v_values_2276_);
v___x_2282_ = lp_algalVerification_Algal_Expr_liftE___redArg(v___x_2281_);
v_result_2283_ = lean_ctor_get(v___x_2282_, 0);
lean_inc_ref(v_result_2283_);
lean_dec_ref(v___x_2282_);
if (lean_obj_tag(v_result_2283_) == 0)
{
lean_object* v_a_2284_; lean_object* v___x_2286_; uint8_t v_isShared_2287_; uint8_t v_isSharedCheck_2291_; 
lean_dec_ref(v_value_2223_);
v_a_2284_ = lean_ctor_get(v_result_2283_, 0);
v_isSharedCheck_2291_ = !lean_is_exclusive(v_result_2283_);
if (v_isSharedCheck_2291_ == 0)
{
v___x_2286_ = v_result_2283_;
v_isShared_2287_ = v_isSharedCheck_2291_;
goto v_resetjp_2285_;
}
else
{
lean_inc(v_a_2284_);
lean_dec(v_result_2283_);
v___x_2286_ = lean_box(0);
v_isShared_2287_ = v_isSharedCheck_2291_;
goto v_resetjp_2285_;
}
v_resetjp_2285_:
{
lean_object* v___x_2289_; 
if (v_isShared_2287_ == 0)
{
v___x_2289_ = v___x_2286_;
goto v_reusejp_2288_;
}
else
{
lean_object* v_reuseFailAlloc_2290_; 
v_reuseFailAlloc_2290_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2290_, 0, v_a_2284_);
v___x_2289_ = v_reuseFailAlloc_2290_;
goto v_reusejp_2288_;
}
v_reusejp_2288_:
{
v_result_2269_ = v___x_2289_;
v_charges_2270_ = v___x_2246_;
goto v___jp_2268_;
}
}
}
else
{
lean_object* v_a_2292_; double v___x_2293_; lean_object* v___x_2294_; lean_object* v_result_2295_; lean_object* v___x_2296_; 
v_a_2292_ = lean_ctor_get(v_result_2283_, 0);
lean_inc(v_a_2292_);
lean_dec_ref_known(v_result_2283_, 1);
v___x_2293_ = lean_unbox_float(v_a_2292_);
lean_dec(v_a_2292_);
v___x_2294_ = lp_algalVerification_Algal_Expr_emitNum(v_value_2223_, v___x_2293_);
v_result_2295_ = lean_ctor_get(v___x_2294_, 0);
lean_inc_ref(v_result_2295_);
lean_dec_ref(v___x_2294_);
v___x_2296_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__4___closed__1, &lp_algalVerification_Algal_Expr_machine___lam__4___closed__1_once, _init_lp_algalVerification_Algal_Expr_machine___lam__4___closed__1);
v_result_2269_ = v_result_2295_;
v_charges_2270_ = v___x_2296_;
goto v___jp_2268_;
}
}
else
{
lean_object* v___x_2297_; lean_object* v_result_2298_; 
lean_dec(v_a_2275_);
lean_dec_ref(v_value_2223_);
v___x_2297_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__6___closed__0, &lp_algalVerification_Algal_Expr_machine___lam__6___closed__0_once, _init_lp_algalVerification_Algal_Expr_machine___lam__6___closed__0);
v_result_2298_ = lean_ctor_get(v___x_2297_, 0);
lean_inc_ref(v_result_2298_);
v_result_2269_ = v_result_2298_;
v_charges_2270_ = v___x_2246_;
goto v___jp_2268_;
}
}
v___jp_2268_:
{
lean_object* v_charges_2271_; lean_object* v___x_2272_; 
v_charges_2271_ = lean_ctor_get(v___x_2267_, 1);
lean_inc(v_charges_2271_);
lean_dec_ref(v___x_2267_);
lean_inc(v_charges_2270_);
v___x_2272_ = l_List_appendTR___redArg(v_charges_2271_, v_charges_2270_);
v_result_2232_ = v_result_2269_;
v_charges_2233_ = v___x_2272_;
goto v___jp_2231_;
}
}
v___jp_2231_:
{
lean_object* v___x_2235_; uint8_t v_isShared_2236_; uint8_t v_isSharedCheck_2242_; 
v_isSharedCheck_2242_ = !lean_is_exclusive(v___x_2230_);
if (v_isSharedCheck_2242_ == 0)
{
lean_object* v_unused_2243_; lean_object* v_unused_2244_; 
v_unused_2243_ = lean_ctor_get(v___x_2230_, 1);
lean_dec(v_unused_2243_);
v_unused_2244_ = lean_ctor_get(v___x_2230_, 0);
lean_dec(v_unused_2244_);
v___x_2235_ = v___x_2230_;
v_isShared_2236_ = v_isSharedCheck_2242_;
goto v_resetjp_2234_;
}
else
{
lean_dec(v___x_2230_);
v___x_2235_ = lean_box(0);
v_isShared_2236_ = v_isSharedCheck_2242_;
goto v_resetjp_2234_;
}
v_resetjp_2234_:
{
lean_object* v___x_2237_; lean_object* v___x_2238_; lean_object* v___x_2240_; 
v___x_2237_ = lean_box(0);
v___x_2238_ = l_List_appendTR___redArg(v___x_2237_, v_charges_2233_);
if (v_isShared_2236_ == 0)
{
lean_ctor_set(v___x_2235_, 1, v___x_2238_);
lean_ctor_set(v___x_2235_, 0, v_result_2232_);
v___x_2240_ = v___x_2235_;
goto v_reusejp_2239_;
}
else
{
lean_object* v_reuseFailAlloc_2241_; 
v_reuseFailAlloc_2241_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2241_, 0, v_result_2232_);
lean_ctor_set(v_reuseFailAlloc_2241_, 1, v___x_2238_);
v___x_2240_ = v_reuseFailAlloc_2241_;
goto v_reusejp_2239_;
}
v_reusejp_2239_:
{
return v___x_2240_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__2(lean_object* v_value_2300_, lean_object* v___x_2301_, lean_object* v_rest_2302_, lean_object* v_env_2303_, lean_object* v_scope_2304_, lean_object* v_value_2305_, lean_object* v_00___2306_){
_start:
{
if (lean_obj_tag(v_rest_2302_) == 1)
{
lean_object* v_rest_2311_; 
v_rest_2311_ = lean_ctor_get(v_rest_2302_, 1);
lean_inc(v_rest_2311_);
if (lean_obj_tag(v_rest_2311_) == 1)
{
lean_object* v_rest_2312_; 
v_rest_2312_ = lean_ctor_get(v_rest_2311_, 1);
if (lean_obj_tag(v_rest_2312_) == 0)
{
lean_object* v_value_2313_; lean_object* v___x_2315_; uint8_t v_isShared_2316_; uint8_t v_isSharedCheck_2424_; 
lean_dec(v___x_2301_);
v_value_2313_ = lean_ctor_get(v_rest_2302_, 0);
v_isSharedCheck_2424_ = !lean_is_exclusive(v_rest_2302_);
if (v_isSharedCheck_2424_ == 0)
{
lean_object* v_unused_2425_; 
v_unused_2425_ = lean_ctor_get(v_rest_2302_, 1);
lean_dec(v_unused_2425_);
v___x_2315_ = v_rest_2302_;
v_isShared_2316_ = v_isSharedCheck_2424_;
goto v_resetjp_2314_;
}
else
{
lean_inc(v_value_2313_);
lean_dec(v_rest_2302_);
v___x_2315_ = lean_box(0);
v_isShared_2316_ = v_isSharedCheck_2424_;
goto v_resetjp_2314_;
}
v_resetjp_2314_:
{
lean_object* v_value_2317_; lean_object* v___x_2319_; uint8_t v_isShared_2320_; uint8_t v_isSharedCheck_2422_; 
v_value_2317_ = lean_ctor_get(v_rest_2311_, 0);
v_isSharedCheck_2422_ = !lean_is_exclusive(v_rest_2311_);
if (v_isSharedCheck_2422_ == 0)
{
lean_object* v_unused_2423_; 
v_unused_2423_ = lean_ctor_get(v_rest_2311_, 1);
lean_dec(v_unused_2423_);
v___x_2319_ = v_rest_2311_;
v_isShared_2320_ = v_isSharedCheck_2422_;
goto v_resetjp_2318_;
}
else
{
lean_inc(v_value_2317_);
lean_dec(v_rest_2311_);
v___x_2319_ = lean_box(0);
v_isShared_2320_ = v_isSharedCheck_2422_;
goto v_resetjp_2318_;
}
v_resetjp_2318_:
{
lean_object* v___x_2321_; lean_object* v___x_2322_; lean_object* v_result_2324_; lean_object* v_charges_2325_; lean_object* v_result_2336_; 
v___x_2321_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_2321_, 0, v_value_2313_);
lean_inc(v_scope_2304_);
v___x_2322_ = lp_algalVerification_Algal_Expr_machine(v_env_2303_, v_scope_2304_, v___x_2321_);
v_result_2336_ = lean_ctor_get(v___x_2322_, 0);
lean_inc_ref(v_result_2336_);
if (lean_obj_tag(v_result_2336_) == 0)
{
lean_object* v_charges_2337_; lean_object* v___x_2339_; uint8_t v_isShared_2340_; uint8_t v_isSharedCheck_2344_; 
lean_del_object(v___x_2319_);
lean_dec(v_value_2317_);
lean_del_object(v___x_2315_);
lean_dec(v_value_2305_);
lean_dec(v_scope_2304_);
lean_dec_ref(v_value_2300_);
v_charges_2337_ = lean_ctor_get(v___x_2322_, 1);
v_isSharedCheck_2344_ = !lean_is_exclusive(v___x_2322_);
if (v_isSharedCheck_2344_ == 0)
{
lean_object* v_unused_2345_; 
v_unused_2345_ = lean_ctor_get(v___x_2322_, 0);
lean_dec(v_unused_2345_);
v___x_2339_ = v___x_2322_;
v_isShared_2340_ = v_isSharedCheck_2344_;
goto v_resetjp_2338_;
}
else
{
lean_inc(v_charges_2337_);
lean_dec(v___x_2322_);
v___x_2339_ = lean_box(0);
v_isShared_2340_ = v_isSharedCheck_2344_;
goto v_resetjp_2338_;
}
v_resetjp_2338_:
{
lean_object* v___x_2342_; 
if (v_isShared_2340_ == 0)
{
v___x_2342_ = v___x_2339_;
goto v_reusejp_2341_;
}
else
{
lean_object* v_reuseFailAlloc_2343_; 
v_reuseFailAlloc_2343_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2343_, 0, v_result_2336_);
lean_ctor_set(v_reuseFailAlloc_2343_, 1, v_charges_2337_);
v___x_2342_ = v_reuseFailAlloc_2343_;
goto v_reusejp_2341_;
}
v_reusejp_2341_:
{
return v___x_2342_;
}
}
}
else
{
lean_object* v_a_2346_; lean_object* v___x_2348_; uint8_t v_isShared_2349_; uint8_t v_isSharedCheck_2421_; 
v_a_2346_ = lean_ctor_get(v_result_2336_, 0);
v_isSharedCheck_2421_ = !lean_is_exclusive(v_result_2336_);
if (v_isSharedCheck_2421_ == 0)
{
v___x_2348_ = v_result_2336_;
v_isShared_2349_ = v_isSharedCheck_2421_;
goto v_resetjp_2347_;
}
else
{
lean_inc(v_a_2346_);
lean_dec(v_result_2336_);
v___x_2348_ = lean_box(0);
v_isShared_2349_ = v_isSharedCheck_2421_;
goto v_resetjp_2347_;
}
v_resetjp_2347_:
{
lean_object* v___x_2350_; lean_object* v___x_2351_; lean_object* v_result_2353_; lean_object* v_charges_2354_; lean_object* v_result_2357_; lean_object* v___x_2358_; 
v___x_2350_ = lean_unsigned_to_nat(0u);
lean_inc_ref(v_value_2300_);
v___x_2351_ = lp_algalVerification_Algal_Expr_asNum(v_value_2300_, v___x_2350_, v_a_2346_);
lean_dec(v_a_2346_);
v_result_2357_ = lean_ctor_get(v___x_2351_, 0);
lean_inc_ref(v_result_2357_);
lean_dec_ref(v___x_2351_);
v___x_2358_ = lean_box(0);
if (lean_obj_tag(v_result_2357_) == 0)
{
lean_object* v_a_2359_; lean_object* v___x_2361_; uint8_t v_isShared_2362_; uint8_t v_isSharedCheck_2366_; 
lean_del_object(v___x_2348_);
lean_del_object(v___x_2319_);
lean_dec(v_value_2317_);
lean_del_object(v___x_2315_);
lean_dec(v_value_2305_);
lean_dec(v_scope_2304_);
lean_dec_ref(v_value_2300_);
v_a_2359_ = lean_ctor_get(v_result_2357_, 0);
v_isSharedCheck_2366_ = !lean_is_exclusive(v_result_2357_);
if (v_isSharedCheck_2366_ == 0)
{
v___x_2361_ = v_result_2357_;
v_isShared_2362_ = v_isSharedCheck_2366_;
goto v_resetjp_2360_;
}
else
{
lean_inc(v_a_2359_);
lean_dec(v_result_2357_);
v___x_2361_ = lean_box(0);
v_isShared_2362_ = v_isSharedCheck_2366_;
goto v_resetjp_2360_;
}
v_resetjp_2360_:
{
lean_object* v___x_2364_; 
if (v_isShared_2362_ == 0)
{
v___x_2364_ = v___x_2361_;
goto v_reusejp_2363_;
}
else
{
lean_object* v_reuseFailAlloc_2365_; 
v_reuseFailAlloc_2365_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2365_, 0, v_a_2359_);
v___x_2364_ = v_reuseFailAlloc_2365_;
goto v_reusejp_2363_;
}
v_reusejp_2363_:
{
v_result_2324_ = v___x_2364_;
v_charges_2325_ = v___x_2358_;
goto v___jp_2323_;
}
}
}
else
{
lean_object* v_a_2367_; lean_object* v___x_2369_; 
v_a_2367_ = lean_ctor_get(v_result_2357_, 0);
lean_inc(v_a_2367_);
lean_dec_ref_known(v_result_2357_, 1);
if (v_isShared_2349_ == 0)
{
lean_ctor_set_tag(v___x_2348_, 0);
lean_ctor_set(v___x_2348_, 0, v_value_2317_);
v___x_2369_ = v___x_2348_;
goto v_reusejp_2368_;
}
else
{
lean_object* v_reuseFailAlloc_2420_; 
v_reuseFailAlloc_2420_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2420_, 0, v_value_2317_);
v___x_2369_ = v_reuseFailAlloc_2420_;
goto v_reusejp_2368_;
}
v_reusejp_2368_:
{
lean_object* v___x_2370_; lean_object* v_result_2372_; lean_object* v_charges_2373_; lean_object* v_result_2376_; 
v___x_2370_ = lp_algalVerification_Algal_Expr_machine(v_env_2303_, v_scope_2304_, v___x_2369_);
v_result_2376_ = lean_ctor_get(v___x_2370_, 0);
lean_inc_ref(v_result_2376_);
if (lean_obj_tag(v_result_2376_) == 0)
{
lean_object* v_charges_2377_; 
lean_dec(v_a_2367_);
lean_del_object(v___x_2319_);
lean_del_object(v___x_2315_);
lean_dec(v_value_2305_);
lean_dec_ref(v_value_2300_);
v_charges_2377_ = lean_ctor_get(v___x_2370_, 1);
lean_inc(v_charges_2377_);
lean_dec_ref(v___x_2370_);
v_result_2353_ = v_result_2376_;
v_charges_2354_ = v_charges_2377_;
goto v___jp_2352_;
}
else
{
lean_object* v_a_2378_; lean_object* v___x_2379_; lean_object* v___x_2380_; lean_object* v___y_2382_; lean_object* v_result_2386_; 
v_a_2378_ = lean_ctor_get(v_result_2376_, 0);
lean_inc(v_a_2378_);
lean_dec_ref_known(v_result_2376_, 1);
v___x_2379_ = lean_unsigned_to_nat(1u);
lean_inc_ref(v_value_2300_);
v___x_2380_ = lp_algalVerification_Algal_Expr_asNum(v_value_2300_, v___x_2379_, v_a_2378_);
lean_dec(v_a_2378_);
v_result_2386_ = lean_ctor_get(v___x_2380_, 0);
lean_inc_ref(v_result_2386_);
lean_dec_ref(v___x_2380_);
if (lean_obj_tag(v_result_2386_) == 0)
{
lean_object* v_a_2387_; lean_object* v___x_2389_; uint8_t v_isShared_2390_; uint8_t v_isSharedCheck_2394_; 
lean_dec(v_a_2367_);
lean_del_object(v___x_2319_);
lean_del_object(v___x_2315_);
lean_dec(v_value_2305_);
lean_dec_ref(v_value_2300_);
v_a_2387_ = lean_ctor_get(v_result_2386_, 0);
v_isSharedCheck_2394_ = !lean_is_exclusive(v_result_2386_);
if (v_isSharedCheck_2394_ == 0)
{
v___x_2389_ = v_result_2386_;
v_isShared_2390_ = v_isSharedCheck_2394_;
goto v_resetjp_2388_;
}
else
{
lean_inc(v_a_2387_);
lean_dec(v_result_2386_);
v___x_2389_ = lean_box(0);
v_isShared_2390_ = v_isSharedCheck_2394_;
goto v_resetjp_2388_;
}
v_resetjp_2388_:
{
lean_object* v___x_2392_; 
if (v_isShared_2390_ == 0)
{
v___x_2392_ = v___x_2389_;
goto v_reusejp_2391_;
}
else
{
lean_object* v_reuseFailAlloc_2393_; 
v_reuseFailAlloc_2393_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2393_, 0, v_a_2387_);
v___x_2392_ = v_reuseFailAlloc_2393_;
goto v_reusejp_2391_;
}
v_reusejp_2391_:
{
v_result_2372_ = v___x_2392_;
v_charges_2373_ = v___x_2358_;
goto v___jp_2371_;
}
}
}
else
{
lean_object* v_a_2395_; lean_object* v___x_2396_; uint8_t v___x_2397_; 
v_a_2395_ = lean_ctor_get(v_result_2386_, 0);
lean_inc(v_a_2395_);
lean_dec_ref_known(v_result_2386_, 1);
v___x_2396_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__2___closed__0));
v___x_2397_ = lean_string_dec_eq(v_value_2300_, v___x_2396_);
if (v___x_2397_ == 0)
{
lean_del_object(v___x_2319_);
lean_del_object(v___x_2315_);
lean_dec(v_value_2305_);
goto v___jp_2398_;
}
else
{
double v___x_2407_; double v___x_2408_; uint8_t v___x_2409_; 
v___x_2407_ = lean_float_once(&lp_algalVerification_Algal_Expr_asIndex___closed__1, &lp_algalVerification_Algal_Expr_asIndex___closed__1_once, _init_lp_algalVerification_Algal_Expr_asIndex___closed__1);
v___x_2408_ = lean_unbox_float(v_a_2395_);
v___x_2409_ = lean_float_beq(v___x_2408_, v___x_2407_);
if (v___x_2409_ == 0)
{
lean_del_object(v___x_2319_);
lean_del_object(v___x_2315_);
lean_dec(v_value_2305_);
goto v___jp_2398_;
}
else
{
uint8_t v___x_2410_; lean_object* v___x_2411_; lean_object* v___x_2413_; 
lean_dec(v_a_2395_);
lean_dec(v_a_2367_);
lean_dec_ref(v_value_2300_);
v___x_2410_ = 7;
v___x_2411_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__2___closed__1));
if (v_isShared_2320_ == 0)
{
lean_ctor_set_tag(v___x_2319_, 0);
lean_ctor_set(v___x_2319_, 1, v_value_2305_);
lean_ctor_set(v___x_2319_, 0, v___x_2411_);
v___x_2413_ = v___x_2319_;
goto v_reusejp_2412_;
}
else
{
lean_object* v_reuseFailAlloc_2419_; 
v_reuseFailAlloc_2419_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2419_, 0, v___x_2411_);
lean_ctor_set(v_reuseFailAlloc_2419_, 1, v_value_2305_);
v___x_2413_ = v_reuseFailAlloc_2419_;
goto v_reusejp_2412_;
}
v_reusejp_2412_:
{
lean_object* v___x_2415_; 
if (v_isShared_2316_ == 0)
{
lean_ctor_set(v___x_2315_, 1, v___x_2358_);
lean_ctor_set(v___x_2315_, 0, v___x_2413_);
v___x_2415_ = v___x_2315_;
goto v_reusejp_2414_;
}
else
{
lean_object* v_reuseFailAlloc_2418_; 
v_reuseFailAlloc_2418_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2418_, 0, v___x_2413_);
lean_ctor_set(v_reuseFailAlloc_2418_, 1, v___x_2358_);
v___x_2415_ = v_reuseFailAlloc_2418_;
goto v_reusejp_2414_;
}
v_reusejp_2414_:
{
lean_object* v___x_2416_; lean_object* v___x_2417_; 
v___x_2416_ = lean_alloc_ctor(0, 1, 1);
lean_ctor_set(v___x_2416_, 0, v___x_2415_);
lean_ctor_set_uint8(v___x_2416_, sizeof(void*)*1, v___x_2410_);
v___x_2417_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_2416_);
v___y_2382_ = v___x_2417_;
goto v___jp_2381_;
}
}
}
}
v___jp_2398_:
{
if (v___x_2397_ == 0)
{
double v___x_2399_; double v___x_2400_; double v___x_2401_; lean_object* v___x_2402_; 
v___x_2399_ = lean_unbox_float(v_a_2367_);
lean_dec(v_a_2367_);
v___x_2400_ = lean_unbox_float(v_a_2395_);
lean_dec(v_a_2395_);
v___x_2401_ = lean_float_sub(v___x_2399_, v___x_2400_);
v___x_2402_ = lp_algalVerification_Algal_Expr_emitNum(v_value_2300_, v___x_2401_);
v___y_2382_ = v___x_2402_;
goto v___jp_2381_;
}
else
{
double v___x_2403_; double v___x_2404_; double v___x_2405_; lean_object* v___x_2406_; 
v___x_2403_ = lean_unbox_float(v_a_2367_);
lean_dec(v_a_2367_);
v___x_2404_ = lean_unbox_float(v_a_2395_);
lean_dec(v_a_2395_);
v___x_2405_ = lean_float_div(v___x_2403_, v___x_2404_);
v___x_2406_ = lp_algalVerification_Algal_Expr_emitNum(v_value_2300_, v___x_2405_);
v___y_2382_ = v___x_2406_;
goto v___jp_2381_;
}
}
}
v___jp_2381_:
{
lean_object* v_result_2383_; lean_object* v_charges_2384_; lean_object* v___x_2385_; 
v_result_2383_ = lean_ctor_get(v___y_2382_, 0);
lean_inc_ref(v_result_2383_);
v_charges_2384_ = lean_ctor_get(v___y_2382_, 1);
lean_inc(v_charges_2384_);
lean_dec_ref(v___y_2382_);
v___x_2385_ = l_List_appendTR___redArg(v___x_2358_, v_charges_2384_);
v_result_2372_ = v_result_2383_;
v_charges_2373_ = v___x_2385_;
goto v___jp_2371_;
}
}
v___jp_2371_:
{
lean_object* v_charges_2374_; lean_object* v___x_2375_; 
v_charges_2374_ = lean_ctor_get(v___x_2370_, 1);
lean_inc(v_charges_2374_);
lean_dec_ref(v___x_2370_);
v___x_2375_ = l_List_appendTR___redArg(v_charges_2374_, v_charges_2373_);
v_result_2353_ = v_result_2372_;
v_charges_2354_ = v___x_2375_;
goto v___jp_2352_;
}
}
}
v___jp_2352_:
{
lean_object* v___x_2355_; lean_object* v___x_2356_; 
v___x_2355_ = lean_box(0);
v___x_2356_ = l_List_appendTR___redArg(v___x_2355_, v_charges_2354_);
v_result_2324_ = v_result_2353_;
v_charges_2325_ = v___x_2356_;
goto v___jp_2323_;
}
}
}
v___jp_2323_:
{
lean_object* v_charges_2326_; lean_object* v___x_2328_; uint8_t v_isShared_2329_; uint8_t v_isSharedCheck_2334_; 
v_charges_2326_ = lean_ctor_get(v___x_2322_, 1);
v_isSharedCheck_2334_ = !lean_is_exclusive(v___x_2322_);
if (v_isSharedCheck_2334_ == 0)
{
lean_object* v_unused_2335_; 
v_unused_2335_ = lean_ctor_get(v___x_2322_, 0);
lean_dec(v_unused_2335_);
v___x_2328_ = v___x_2322_;
v_isShared_2329_ = v_isSharedCheck_2334_;
goto v_resetjp_2327_;
}
else
{
lean_inc(v_charges_2326_);
lean_dec(v___x_2322_);
v___x_2328_ = lean_box(0);
v_isShared_2329_ = v_isSharedCheck_2334_;
goto v_resetjp_2327_;
}
v_resetjp_2327_:
{
lean_object* v___x_2330_; lean_object* v___x_2332_; 
v___x_2330_ = l_List_appendTR___redArg(v_charges_2326_, v_charges_2325_);
if (v_isShared_2329_ == 0)
{
lean_ctor_set(v___x_2328_, 1, v___x_2330_);
lean_ctor_set(v___x_2328_, 0, v_result_2324_);
v___x_2332_ = v___x_2328_;
goto v_reusejp_2331_;
}
else
{
lean_object* v_reuseFailAlloc_2333_; 
v_reuseFailAlloc_2333_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2333_, 0, v_result_2324_);
lean_ctor_set(v_reuseFailAlloc_2333_, 1, v___x_2330_);
v___x_2332_ = v_reuseFailAlloc_2333_;
goto v_reusejp_2331_;
}
v_reusejp_2331_:
{
return v___x_2332_;
}
}
}
}
}
}
else
{
lean_dec_ref_known(v_rest_2311_, 2);
lean_dec_ref_known(v_rest_2302_, 2);
lean_dec(v_value_2305_);
lean_dec(v_scope_2304_);
goto v___jp_2307_;
}
}
else
{
lean_dec_ref_known(v_rest_2302_, 2);
lean_dec(v_rest_2311_);
lean_dec(v_value_2305_);
lean_dec(v_scope_2304_);
goto v___jp_2307_;
}
}
else
{
lean_dec(v_value_2305_);
lean_dec(v_scope_2304_);
lean_dec(v_rest_2302_);
goto v___jp_2307_;
}
v___jp_2307_:
{
lean_object* v___x_2308_; lean_object* v___x_2309_; lean_object* v___x_2310_; 
v___x_2308_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__18___closed__0));
v___x_2309_ = lp_algalVerification_Algal_Expr_errArity(v_value_2300_, v___x_2308_, v___x_2301_);
v___x_2310_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_2309_);
return v___x_2310_;
}
}
}
static double _init_lp_algalVerification_Algal_Expr_machine___lam__1___closed__1(void){
_start:
{
lean_object* v___x_2426_; double v___x_2427_; 
v___x_2426_ = lean_unsigned_to_nat(1u);
v___x_2427_ = lean_float_of_nat(v___x_2426_);
return v___x_2427_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__1(lean_object* v_value_2428_, lean_object* v_rest_2429_, lean_object* v_env_2430_, lean_object* v_scope_2431_, lean_object* v_00___2432_){
_start:
{
lean_object* v___x_2433_; lean_object* v___x_2434_; lean_object* v___x_2435_; lean_object* v_result_2437_; lean_object* v_charges_2438_; lean_object* v_result_2450_; lean_object* v___x_2451_; 
v___x_2433_ = lean_unsigned_to_nat(1u);
v___x_2434_ = lean_box(0);
lean_inc_ref(v_value_2428_);
v___x_2435_ = lp_algalVerification_Algal_Expr_checkArity(v_value_2428_, v_rest_2429_, v___x_2433_, v___x_2434_);
v_result_2450_ = lean_ctor_get(v___x_2435_, 0);
lean_inc_ref(v_result_2450_);
v___x_2451_ = lean_box(0);
if (lean_obj_tag(v_result_2450_) == 0)
{
lean_object* v___x_2453_; uint8_t v_isShared_2454_; uint8_t v_isSharedCheck_2466_; 
lean_dec(v_scope_2431_);
lean_dec(v_rest_2429_);
lean_dec_ref(v_value_2428_);
v_isSharedCheck_2466_ = !lean_is_exclusive(v___x_2435_);
if (v_isSharedCheck_2466_ == 0)
{
lean_object* v_unused_2467_; lean_object* v_unused_2468_; 
v_unused_2467_ = lean_ctor_get(v___x_2435_, 1);
lean_dec(v_unused_2467_);
v_unused_2468_ = lean_ctor_get(v___x_2435_, 0);
lean_dec(v_unused_2468_);
v___x_2453_ = v___x_2435_;
v_isShared_2454_ = v_isSharedCheck_2466_;
goto v_resetjp_2452_;
}
else
{
lean_dec(v___x_2435_);
v___x_2453_ = lean_box(0);
v_isShared_2454_ = v_isSharedCheck_2466_;
goto v_resetjp_2452_;
}
v_resetjp_2452_:
{
lean_object* v_a_2455_; lean_object* v___x_2457_; uint8_t v_isShared_2458_; uint8_t v_isSharedCheck_2465_; 
v_a_2455_ = lean_ctor_get(v_result_2450_, 0);
v_isSharedCheck_2465_ = !lean_is_exclusive(v_result_2450_);
if (v_isSharedCheck_2465_ == 0)
{
v___x_2457_ = v_result_2450_;
v_isShared_2458_ = v_isSharedCheck_2465_;
goto v_resetjp_2456_;
}
else
{
lean_inc(v_a_2455_);
lean_dec(v_result_2450_);
v___x_2457_ = lean_box(0);
v_isShared_2458_ = v_isSharedCheck_2465_;
goto v_resetjp_2456_;
}
v_resetjp_2456_:
{
lean_object* v___x_2460_; 
if (v_isShared_2458_ == 0)
{
v___x_2460_ = v___x_2457_;
goto v_reusejp_2459_;
}
else
{
lean_object* v_reuseFailAlloc_2464_; 
v_reuseFailAlloc_2464_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2464_, 0, v_a_2455_);
v___x_2460_ = v_reuseFailAlloc_2464_;
goto v_reusejp_2459_;
}
v_reusejp_2459_:
{
lean_object* v___x_2462_; 
if (v_isShared_2454_ == 0)
{
lean_ctor_set(v___x_2453_, 1, v___x_2451_);
lean_ctor_set(v___x_2453_, 0, v___x_2460_);
v___x_2462_ = v___x_2453_;
goto v_reusejp_2461_;
}
else
{
lean_object* v_reuseFailAlloc_2463_; 
v_reuseFailAlloc_2463_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2463_, 0, v___x_2460_);
lean_ctor_set(v_reuseFailAlloc_2463_, 1, v___x_2451_);
v___x_2462_ = v_reuseFailAlloc_2463_;
goto v_reusejp_2461_;
}
v_reusejp_2461_:
{
return v___x_2462_;
}
}
}
}
}
else
{
lean_object* v___x_2469_; lean_object* v___x_2470_; lean_object* v___x_2471_; lean_object* v___x_2472_; lean_object* v_result_2474_; lean_object* v_charges_2475_; lean_object* v_result_2478_; 
lean_dec_ref_known(v_result_2450_, 1);
v___x_2469_ = lean_box(0);
v___x_2470_ = lean_unsigned_to_nat(2u);
v___x_2471_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v___x_2471_, 0, v_rest_2429_);
lean_ctor_set(v___x_2471_, 1, v___x_2469_);
lean_ctor_set(v___x_2471_, 2, v___x_2470_);
v___x_2472_ = lp_algalVerification_Algal_Expr_machine(v_env_2430_, v_scope_2431_, v___x_2471_);
v_result_2478_ = lean_ctor_get(v___x_2472_, 0);
lean_inc_ref(v_result_2478_);
if (lean_obj_tag(v_result_2478_) == 0)
{
lean_object* v_charges_2479_; 
lean_dec_ref(v_value_2428_);
v_charges_2479_ = lean_ctor_get(v___x_2472_, 1);
lean_inc(v_charges_2479_);
lean_dec_ref(v___x_2472_);
v_result_2437_ = v_result_2478_;
v_charges_2438_ = v_charges_2479_;
goto v___jp_2436_;
}
else
{
lean_object* v_a_2480_; 
v_a_2480_ = lean_ctor_get(v_result_2478_, 0);
lean_inc(v_a_2480_);
lean_dec_ref_known(v_result_2478_, 1);
if (lean_obj_tag(v_a_2480_) == 4)
{
lean_object* v_values_2481_; lean_object* v___x_2482_; uint8_t v___x_2483_; lean_object* v___x_2484_; lean_object* v___y_2485_; double v___y_2487_; 
v_values_2481_ = lean_ctor_get(v_a_2480_, 0);
lean_inc(v_values_2481_);
lean_dec_ref_known(v_a_2480_, 1);
v___x_2482_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__1___closed__0));
v___x_2483_ = lean_string_dec_eq(v_value_2428_, v___x_2482_);
v___x_2484_ = lean_box(v___x_2483_);
v___y_2485_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Expr_machine___lam__0___boxed), 3, 1);
lean_closure_set(v___y_2485_, 0, v___x_2484_);
if (v___x_2483_ == 0)
{
double v___x_2505_; 
v___x_2505_ = lean_float_once(&lp_algalVerification_Algal_Expr_machine___lam__1___closed__1, &lp_algalVerification_Algal_Expr_machine___lam__1___closed__1_once, _init_lp_algalVerification_Algal_Expr_machine___lam__1___closed__1);
v___y_2487_ = v___x_2505_;
goto v___jp_2486_;
}
else
{
double v___x_2506_; 
v___x_2506_ = lean_float_once(&lp_algalVerification_Algal_Expr_asIndex___closed__1, &lp_algalVerification_Algal_Expr_asIndex___closed__1_once, _init_lp_algalVerification_Algal_Expr_asIndex___closed__1);
v___y_2487_ = v___x_2506_;
goto v___jp_2486_;
}
v___jp_2486_:
{
lean_object* v___x_2488_; lean_object* v___x_2489_; lean_object* v___x_2490_; lean_object* v_result_2491_; 
v___x_2488_ = lean_unsigned_to_nat(0u);
lean_inc_ref(v_value_2428_);
v___x_2489_ = lp_algalVerification_Algal_Expr_numFold(v_value_2428_, v___y_2485_, v___y_2487_, v_values_2481_, v___x_2488_);
lean_dec(v_values_2481_);
v___x_2490_ = lp_algalVerification_Algal_Expr_liftE___redArg(v___x_2489_);
v_result_2491_ = lean_ctor_get(v___x_2490_, 0);
lean_inc_ref(v_result_2491_);
lean_dec_ref(v___x_2490_);
if (lean_obj_tag(v_result_2491_) == 0)
{
lean_object* v_a_2492_; lean_object* v___x_2494_; uint8_t v_isShared_2495_; uint8_t v_isSharedCheck_2499_; 
lean_dec_ref(v_value_2428_);
v_a_2492_ = lean_ctor_get(v_result_2491_, 0);
v_isSharedCheck_2499_ = !lean_is_exclusive(v_result_2491_);
if (v_isSharedCheck_2499_ == 0)
{
v___x_2494_ = v_result_2491_;
v_isShared_2495_ = v_isSharedCheck_2499_;
goto v_resetjp_2493_;
}
else
{
lean_inc(v_a_2492_);
lean_dec(v_result_2491_);
v___x_2494_ = lean_box(0);
v_isShared_2495_ = v_isSharedCheck_2499_;
goto v_resetjp_2493_;
}
v_resetjp_2493_:
{
lean_object* v___x_2497_; 
if (v_isShared_2495_ == 0)
{
v___x_2497_ = v___x_2494_;
goto v_reusejp_2496_;
}
else
{
lean_object* v_reuseFailAlloc_2498_; 
v_reuseFailAlloc_2498_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2498_, 0, v_a_2492_);
v___x_2497_ = v_reuseFailAlloc_2498_;
goto v_reusejp_2496_;
}
v_reusejp_2496_:
{
v_result_2474_ = v___x_2497_;
v_charges_2475_ = v___x_2451_;
goto v___jp_2473_;
}
}
}
else
{
lean_object* v_a_2500_; double v___x_2501_; lean_object* v___x_2502_; lean_object* v_result_2503_; lean_object* v___x_2504_; 
v_a_2500_ = lean_ctor_get(v_result_2491_, 0);
lean_inc(v_a_2500_);
lean_dec_ref_known(v_result_2491_, 1);
v___x_2501_ = lean_unbox_float(v_a_2500_);
lean_dec(v_a_2500_);
v___x_2502_ = lp_algalVerification_Algal_Expr_emitNum(v_value_2428_, v___x_2501_);
v_result_2503_ = lean_ctor_get(v___x_2502_, 0);
lean_inc_ref(v_result_2503_);
lean_dec_ref(v___x_2502_);
v___x_2504_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__4___closed__1, &lp_algalVerification_Algal_Expr_machine___lam__4___closed__1_once, _init_lp_algalVerification_Algal_Expr_machine___lam__4___closed__1);
v_result_2474_ = v_result_2503_;
v_charges_2475_ = v___x_2504_;
goto v___jp_2473_;
}
}
}
else
{
lean_object* v___x_2507_; lean_object* v_result_2508_; 
lean_dec(v_a_2480_);
lean_dec_ref(v_value_2428_);
v___x_2507_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__6___closed__0, &lp_algalVerification_Algal_Expr_machine___lam__6___closed__0_once, _init_lp_algalVerification_Algal_Expr_machine___lam__6___closed__0);
v_result_2508_ = lean_ctor_get(v___x_2507_, 0);
lean_inc_ref(v_result_2508_);
v_result_2474_ = v_result_2508_;
v_charges_2475_ = v___x_2451_;
goto v___jp_2473_;
}
}
v___jp_2473_:
{
lean_object* v_charges_2476_; lean_object* v___x_2477_; 
v_charges_2476_ = lean_ctor_get(v___x_2472_, 1);
lean_inc(v_charges_2476_);
lean_dec_ref(v___x_2472_);
lean_inc(v_charges_2475_);
v___x_2477_ = l_List_appendTR___redArg(v_charges_2476_, v_charges_2475_);
v_result_2437_ = v_result_2474_;
v_charges_2438_ = v___x_2477_;
goto v___jp_2436_;
}
}
v___jp_2436_:
{
lean_object* v___x_2440_; uint8_t v_isShared_2441_; uint8_t v_isSharedCheck_2447_; 
v_isSharedCheck_2447_ = !lean_is_exclusive(v___x_2435_);
if (v_isSharedCheck_2447_ == 0)
{
lean_object* v_unused_2448_; lean_object* v_unused_2449_; 
v_unused_2448_ = lean_ctor_get(v___x_2435_, 1);
lean_dec(v_unused_2448_);
v_unused_2449_ = lean_ctor_get(v___x_2435_, 0);
lean_dec(v_unused_2449_);
v___x_2440_ = v___x_2435_;
v_isShared_2441_ = v_isSharedCheck_2447_;
goto v_resetjp_2439_;
}
else
{
lean_dec(v___x_2435_);
v___x_2440_ = lean_box(0);
v_isShared_2441_ = v_isSharedCheck_2447_;
goto v_resetjp_2439_;
}
v_resetjp_2439_:
{
lean_object* v___x_2442_; lean_object* v___x_2443_; lean_object* v___x_2445_; 
v___x_2442_ = lean_box(0);
v___x_2443_ = l_List_appendTR___redArg(v___x_2442_, v_charges_2438_);
if (v_isShared_2441_ == 0)
{
lean_ctor_set(v___x_2440_, 1, v___x_2443_);
lean_ctor_set(v___x_2440_, 0, v_result_2437_);
v___x_2445_ = v___x_2440_;
goto v_reusejp_2444_;
}
else
{
lean_object* v_reuseFailAlloc_2446_; 
v_reuseFailAlloc_2446_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2446_, 0, v_result_2437_);
lean_ctor_set(v_reuseFailAlloc_2446_, 1, v___x_2443_);
v___x_2445_ = v_reuseFailAlloc_2446_;
goto v_reusejp_2444_;
}
v_reusejp_2444_:
{
return v___x_2445_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine(lean_object* v_env_2514_, lean_object* v_scope_2515_, lean_object* v_w_2516_){
_start:
{
switch(lean_obj_tag(v_w_2516_))
{
case 0:
{
lean_object* v_v_2517_; lean_object* v___x_2519_; uint8_t v_isShared_2520_; uint8_t v_isSharedCheck_4191_; 
v_v_2517_ = lean_ctor_get(v_w_2516_, 0);
v_isSharedCheck_4191_ = !lean_is_exclusive(v_w_2516_);
if (v_isSharedCheck_4191_ == 0)
{
v___x_2519_ = v_w_2516_;
v_isShared_2520_ = v_isSharedCheck_4191_;
goto v_resetjp_2518_;
}
else
{
lean_inc(v_v_2517_);
lean_dec(v_w_2516_);
v___x_2519_ = lean_box(0);
v_isShared_2520_ = v_isSharedCheck_4191_;
goto v_resetjp_2518_;
}
v_resetjp_2518_:
{
switch(lean_obj_tag(v_v_2517_))
{
case 5:
{
lean_object* v_fields_2521_; lean_object* v___x_2522_; lean_object* v___y_2524_; lean_object* v___x_2537_; lean_object* v___x_2538_; uint8_t v___x_2539_; 
lean_del_object(v___x_2519_);
v_fields_2521_ = lean_ctor_get(v_v_2517_, 0);
lean_inc(v_fields_2521_);
lean_dec_ref_known(v_v_2517_, 1);
v___x_2522_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___closed__0, &lp_algalVerification_Algal_Expr_machine___closed__0_once, _init_lp_algalVerification_Algal_Expr_machine___closed__0);
v___x_2537_ = lean_unsigned_to_nat(256u);
v___x_2538_ = lp_algalVerification_Algal_Expr_fieldsLength(v_fields_2521_);
v___x_2539_ = lean_nat_dec_lt(v___x_2537_, v___x_2538_);
lean_dec(v___x_2538_);
if (v___x_2539_ == 0)
{
lean_object* v___x_2540_; lean_object* v___x_2541_; lean_object* v___x_2542_; lean_object* v___x_2543_; lean_object* v___x_2544_; 
v___x_2540_ = lp_algalVerification_Algal_Expr_sortFieldsByte(v_fields_2521_);
v___x_2541_ = lean_box(0);
v___x_2542_ = lean_unsigned_to_nat(2u);
v___x_2543_ = lean_alloc_ctor(2, 3, 0);
lean_ctor_set(v___x_2543_, 0, v___x_2540_);
lean_ctor_set(v___x_2543_, 1, v___x_2541_);
lean_ctor_set(v___x_2543_, 2, v___x_2542_);
v___x_2544_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_2543_);
v___y_2524_ = v___x_2544_;
goto v___jp_2523_;
}
else
{
lean_object* v___x_2545_; 
lean_dec(v_fields_2521_);
lean_dec(v_scope_2515_);
v___x_2545_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___closed__1, &lp_algalVerification_Algal_Expr_machine___closed__1_once, _init_lp_algalVerification_Algal_Expr_machine___closed__1);
v___y_2524_ = v___x_2545_;
goto v___jp_2523_;
}
v___jp_2523_:
{
lean_object* v_result_2525_; lean_object* v_charges_2526_; lean_object* v___x_2528_; uint8_t v_isShared_2529_; uint8_t v_isSharedCheck_2536_; 
v_result_2525_ = lean_ctor_get(v___y_2524_, 0);
v_charges_2526_ = lean_ctor_get(v___y_2524_, 1);
v_isSharedCheck_2536_ = !lean_is_exclusive(v___y_2524_);
if (v_isSharedCheck_2536_ == 0)
{
v___x_2528_ = v___y_2524_;
v_isShared_2529_ = v_isSharedCheck_2536_;
goto v_resetjp_2527_;
}
else
{
lean_inc(v_charges_2526_);
lean_inc(v_result_2525_);
lean_dec(v___y_2524_);
v___x_2528_ = lean_box(0);
v_isShared_2529_ = v_isSharedCheck_2536_;
goto v_resetjp_2527_;
}
v_resetjp_2527_:
{
lean_object* v_charges_2530_; lean_object* v___x_2531_; lean_object* v___x_2533_; 
v_charges_2530_ = lean_ctor_get(v___x_2522_, 1);
lean_inc(v_charges_2530_);
v___x_2531_ = l_List_appendTR___redArg(v_charges_2530_, v_charges_2526_);
if (v_isShared_2529_ == 0)
{
lean_ctor_set(v___x_2528_, 1, v___x_2531_);
v___x_2533_ = v___x_2528_;
goto v_reusejp_2532_;
}
else
{
lean_object* v_reuseFailAlloc_2535_; 
v_reuseFailAlloc_2535_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2535_, 0, v_result_2525_);
lean_ctor_set(v_reuseFailAlloc_2535_, 1, v___x_2531_);
v___x_2533_ = v_reuseFailAlloc_2535_;
goto v_reusejp_2532_;
}
v_reusejp_2532_:
{
lean_object* v___x_2534_; 
v___x_2534_ = lp_algalVerification_Algal_Expr_postCheck(v___x_2533_);
return v___x_2534_;
}
}
}
}
case 4:
{
lean_object* v_values_2546_; lean_object* v___x_2548_; uint8_t v_isShared_2549_; uint8_t v_isSharedCheck_4183_; 
v_values_2546_ = lean_ctor_get(v_v_2517_, 0);
v_isSharedCheck_4183_ = !lean_is_exclusive(v_v_2517_);
if (v_isSharedCheck_4183_ == 0)
{
v___x_2548_ = v_v_2517_;
v_isShared_2549_ = v_isSharedCheck_4183_;
goto v_resetjp_2547_;
}
else
{
lean_inc(v_values_2546_);
lean_dec(v_v_2517_);
v___x_2548_ = lean_box(0);
v_isShared_2549_ = v_isSharedCheck_4183_;
goto v_resetjp_2547_;
}
v_resetjp_2547_:
{
if (lean_obj_tag(v_values_2546_) == 0)
{
lean_object* v___x_2550_; 
lean_del_object(v___x_2548_);
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_2550_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___closed__8, &lp_algalVerification_Algal_Expr_machine___closed__8_once, _init_lp_algalVerification_Algal_Expr_machine___closed__8);
return v___x_2550_;
}
else
{
lean_object* v_value_2551_; 
v_value_2551_ = lean_ctor_get(v_values_2546_, 0);
lean_inc(v_value_2551_);
if (lean_obj_tag(v_value_2551_) == 3)
{
lean_object* v_rest_2552_; lean_object* v_value_2553_; lean_object* v___x_2554_; lean_object* v___x_2555_; lean_object* v___x_2556_; lean_object* v_result_2558_; lean_object* v_charges_2559_; lean_object* v___y_2572_; lean_object* v___x_2575_; uint8_t v___x_2576_; 
lean_del_object(v___x_2548_);
v_rest_2552_ = lean_ctor_get(v_values_2546_, 1);
lean_inc(v_rest_2552_);
lean_dec_ref_known(v_values_2546_, 2);
v_value_2553_ = lean_ctor_get(v_value_2551_, 0);
lean_inc_ref(v_value_2553_);
v___x_2554_ = lp_algalVerification_Algal_Expr_itemsLength(v_rest_2552_);
v___x_2555_ = lp_algalVerification_Algal_Expr_baseCost(v_value_2553_, v___x_2554_);
v___x_2556_ = lp_algalVerification_Algal_Expr_charge(v___x_2555_);
v___x_2575_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__1___closed__0));
v___x_2576_ = lean_string_dec_eq(v_value_2553_, v___x_2575_);
if (v___x_2576_ == 0)
{
lean_object* v___x_2577_; uint8_t v___x_2578_; 
v___x_2577_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__9));
v___x_2578_ = lean_string_dec_eq(v_value_2553_, v___x_2577_);
if (v___x_2578_ == 0)
{
lean_object* v___x_2579_; uint8_t v___x_2580_; 
v___x_2579_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__10));
v___x_2580_ = lean_string_dec_eq(v_value_2553_, v___x_2579_);
if (v___x_2580_ == 0)
{
lean_object* v___x_2581_; uint8_t v___x_2582_; 
v___x_2581_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__2___closed__0));
v___x_2582_ = lean_string_dec_eq(v_value_2553_, v___x_2581_);
if (v___x_2582_ == 0)
{
lean_object* v___x_2584_; uint8_t v_isShared_2585_; uint8_t v_isSharedCheck_4152_; 
v_isSharedCheck_4152_ = !lean_is_exclusive(v_value_2551_);
if (v_isSharedCheck_4152_ == 0)
{
lean_object* v_unused_4153_; 
v_unused_4153_ = lean_ctor_get(v_value_2551_, 0);
lean_dec(v_unused_4153_);
v___x_2584_ = v_value_2551_;
v_isShared_2585_ = v_isSharedCheck_4152_;
goto v_resetjp_2583_;
}
else
{
lean_dec(v_value_2551_);
v___x_2584_ = lean_box(0);
v_isShared_2585_ = v_isSharedCheck_4152_;
goto v_resetjp_2583_;
}
v_resetjp_2583_:
{
lean_object* v___x_2586_; uint8_t v___x_2587_; 
v___x_2586_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__11));
v___x_2587_ = lean_string_dec_eq(v_value_2553_, v___x_2586_);
if (v___x_2587_ == 0)
{
lean_object* v___x_2588_; uint8_t v___x_2589_; 
v___x_2588_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__4___closed__0));
v___x_2589_ = lean_string_dec_eq(v_value_2553_, v___x_2588_);
if (v___x_2589_ == 0)
{
lean_object* v___x_2590_; uint8_t v___x_2591_; 
v___x_2590_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__12));
v___x_2591_ = lean_string_dec_eq(v_value_2553_, v___x_2590_);
if (v___x_2591_ == 0)
{
lean_object* v___x_2592_; uint8_t v___x_2593_; 
v___x_2592_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__5___closed__0));
v___x_2593_ = lean_string_dec_eq(v_value_2553_, v___x_2592_);
if (v___x_2593_ == 0)
{
lean_object* v___x_2594_; uint8_t v___x_2595_; 
v___x_2594_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__5___closed__1));
v___x_2595_ = lean_string_dec_eq(v_value_2553_, v___x_2594_);
if (v___x_2595_ == 0)
{
lean_object* v___x_2596_; uint8_t v___x_2597_; 
v___x_2596_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__5___closed__2));
v___x_2597_ = lean_string_dec_eq(v_value_2553_, v___x_2596_);
if (v___x_2597_ == 0)
{
lean_object* v___x_2598_; uint8_t v___x_2599_; 
v___x_2598_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__13));
v___x_2599_ = lean_string_dec_eq(v_value_2553_, v___x_2598_);
if (v___x_2599_ == 0)
{
lean_object* v___x_2600_; uint8_t v___x_2601_; 
v___x_2600_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__14));
v___x_2601_ = lean_string_dec_eq(v_value_2553_, v___x_2600_);
if (v___x_2601_ == 0)
{
lean_object* v___f_2602_; lean_object* v___x_2603_; uint8_t v___x_2604_; 
v___f_2602_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__15));
v___x_2603_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__8___closed__0));
v___x_2604_ = lean_string_dec_eq(v_value_2553_, v___x_2603_);
if (v___x_2604_ == 0)
{
lean_object* v___x_2605_; uint8_t v___x_2606_; 
v___x_2605_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__8___closed__1));
v___x_2606_ = lean_string_dec_eq(v_value_2553_, v___x_2605_);
if (v___x_2606_ == 0)
{
lean_object* v___x_2607_; uint8_t v___x_2608_; 
v___x_2607_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__8___closed__2));
v___x_2608_ = lean_string_dec_eq(v_value_2553_, v___x_2607_);
if (v___x_2608_ == 0)
{
lean_object* v___x_2609_; uint8_t v___x_2610_; 
v___x_2609_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__8___closed__3));
v___x_2610_ = lean_string_dec_eq(v_value_2553_, v___x_2609_);
if (v___x_2610_ == 0)
{
lean_object* v___x_2611_; uint8_t v___x_2612_; 
v___x_2611_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__10___closed__1));
v___x_2612_ = lean_string_dec_eq(v_value_2553_, v___x_2611_);
if (v___x_2612_ == 0)
{
lean_object* v___x_2613_; uint8_t v___x_2614_; 
v___x_2613_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__16));
v___x_2614_ = lean_string_dec_eq(v_value_2553_, v___x_2613_);
if (v___x_2614_ == 0)
{
lean_object* v___x_2615_; uint8_t v___x_2616_; 
v___x_2615_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__0));
v___x_2616_ = lean_string_dec_eq(v_value_2553_, v___x_2615_);
if (v___x_2616_ == 0)
{
lean_object* v___x_2617_; uint8_t v___x_2618_; 
v___x_2617_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__1));
v___x_2618_ = lean_string_dec_eq(v_value_2553_, v___x_2617_);
if (v___x_2618_ == 0)
{
lean_object* v___x_2619_; uint8_t v___x_2620_; 
v___x_2619_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__2));
v___x_2620_ = lean_string_dec_eq(v_value_2553_, v___x_2619_);
if (v___x_2620_ == 0)
{
lean_object* v___x_2621_; uint8_t v___x_2622_; 
v___x_2621_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__3));
v___x_2622_ = lean_string_dec_eq(v_value_2553_, v___x_2621_);
if (v___x_2622_ == 0)
{
lean_object* v___x_2623_; uint8_t v___x_2624_; 
v___x_2623_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__4));
v___x_2624_ = lean_string_dec_eq(v_value_2553_, v___x_2623_);
if (v___x_2624_ == 0)
{
lean_object* v___x_2625_; uint8_t v___x_2626_; 
v___x_2625_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__12));
v___x_2626_ = lean_string_dec_eq(v_value_2553_, v___x_2625_);
if (v___x_2626_ == 0)
{
lean_object* v___x_2627_; uint8_t v___x_2628_; 
v___x_2627_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asList___closed__0));
v___x_2628_ = lean_string_dec_eq(v_value_2553_, v___x_2627_);
if (v___x_2628_ == 0)
{
lean_object* v___x_2629_; uint8_t v___x_2630_; 
v___x_2629_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__17));
v___x_2630_ = lean_string_dec_eq(v_value_2553_, v___x_2629_);
if (v___x_2630_ == 0)
{
lean_object* v___x_2631_; uint8_t v___x_2632_; 
v___x_2631_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__18));
v___x_2632_ = lean_string_dec_eq(v_value_2553_, v___x_2631_);
if (v___x_2632_ == 0)
{
lean_object* v___x_2633_; uint8_t v___x_2634_; 
v___x_2633_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__19));
v___x_2634_ = lean_string_dec_eq(v_value_2553_, v___x_2633_);
if (v___x_2634_ == 0)
{
lean_object* v___x_2635_; uint8_t v___x_2636_; 
v___x_2635_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asMap___closed__0));
v___x_2636_ = lean_string_dec_eq(v_value_2553_, v___x_2635_);
if (v___x_2636_ == 0)
{
lean_object* v___x_2637_; uint8_t v___x_2638_; 
v___x_2637_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__20));
v___x_2638_ = lean_string_dec_eq(v_value_2553_, v___x_2637_);
if (v___x_2638_ == 0)
{
lean_object* v___x_2639_; uint8_t v___x_2640_; 
v___x_2639_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__21));
v___x_2640_ = lean_string_dec_eq(v_value_2553_, v___x_2639_);
if (v___x_2640_ == 0)
{
lean_object* v___x_2641_; uint8_t v___x_2642_; 
v___x_2641_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__22));
v___x_2642_ = lean_string_dec_eq(v_value_2553_, v___x_2641_);
if (v___x_2642_ == 0)
{
lean_object* v___x_2643_; uint8_t v___x_2644_; 
v___x_2643_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__23));
v___x_2644_ = lean_string_dec_eq(v_value_2553_, v___x_2643_);
if (v___x_2644_ == 0)
{
lean_object* v___x_2645_; uint8_t v___x_2646_; 
v___x_2645_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__12___closed__0));
v___x_2646_ = lean_string_dec_eq(v_value_2553_, v___x_2645_);
if (v___x_2646_ == 0)
{
lean_object* v___x_2647_; uint8_t v___x_2648_; 
v___x_2647_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__24));
v___x_2648_ = lean_string_dec_eq(v_value_2553_, v___x_2647_);
if (v___x_2648_ == 0)
{
lean_object* v___x_2649_; uint8_t v___x_2650_; 
v___x_2649_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__25));
v___x_2650_ = lean_string_dec_eq(v_value_2553_, v___x_2649_);
if (v___x_2650_ == 0)
{
lean_object* v___x_2651_; uint8_t v___x_2652_; 
v___x_2651_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__26));
v___x_2652_ = lean_string_dec_eq(v_value_2553_, v___x_2651_);
if (v___x_2652_ == 0)
{
lean_object* v___x_2653_; uint8_t v___x_2654_; 
v___x_2653_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__27));
v___x_2654_ = lean_string_dec_eq(v_value_2553_, v___x_2653_);
if (v___x_2654_ == 0)
{
lean_object* v___x_2655_; uint8_t v___x_2656_; 
v___x_2655_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__28));
v___x_2656_ = lean_string_dec_eq(v_value_2553_, v___x_2655_);
if (v___x_2656_ == 0)
{
lean_object* v___x_2657_; uint8_t v___x_2658_; 
v___x_2657_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__13___closed__3));
v___x_2658_ = lean_string_dec_eq(v_value_2553_, v___x_2657_);
if (v___x_2658_ == 0)
{
lean_object* v___x_2659_; uint8_t v___x_2660_; 
v___x_2659_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__13___closed__4));
v___x_2660_ = lean_string_dec_eq(v_value_2553_, v___x_2659_);
if (v___x_2660_ == 0)
{
lean_object* v___x_2661_; uint8_t v___x_2662_; 
v___x_2661_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__29));
v___x_2662_ = lean_string_dec_eq(v_value_2553_, v___x_2661_);
if (v___x_2662_ == 0)
{
lean_object* v___x_2663_; uint8_t v___x_2664_; 
v___x_2663_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__30));
v___x_2664_ = lean_string_dec_eq(v_value_2553_, v___x_2663_);
if (v___x_2664_ == 0)
{
lean_object* v___x_2665_; uint8_t v___x_2666_; 
v___x_2665_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__31));
v___x_2666_ = lean_string_dec_eq(v_value_2553_, v___x_2665_);
if (v___x_2666_ == 0)
{
lean_object* v___x_2667_; uint8_t v___x_2668_; 
lean_del_object(v___x_2584_);
v___x_2667_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__32));
v___x_2668_ = lean_string_dec_eq(v_value_2553_, v___x_2667_);
if (v___x_2668_ == 0)
{
lean_object* v___x_2669_; uint8_t v___x_2670_; 
v___x_2669_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__14___closed__0));
v___x_2670_ = lean_string_dec_eq(v_value_2553_, v___x_2669_);
if (v___x_2670_ == 0)
{
lean_object* v___x_2671_; uint8_t v___x_2672_; 
v___x_2671_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__33));
v___x_2672_ = lean_string_dec_eq(v_value_2553_, v___x_2671_);
if (v___x_2672_ == 0)
{
lean_object* v___x_2673_; uint8_t v___x_2674_; 
v___x_2673_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__34));
v___x_2674_ = lean_string_dec_eq(v_value_2553_, v___x_2673_);
if (v___x_2674_ == 0)
{
lean_object* v___x_2675_; uint8_t v___x_2676_; 
lean_del_object(v___x_2519_);
v___x_2675_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__15___closed__0));
v___x_2676_ = lean_string_dec_eq(v_value_2553_, v___x_2675_);
if (v___x_2676_ == 0)
{
lean_object* v___x_2677_; uint8_t v___x_2678_; 
v___x_2677_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__35));
v___x_2678_ = lean_string_dec_eq(v_value_2553_, v___x_2677_);
if (v___x_2678_ == 0)
{
lean_object* v___x_2679_; uint8_t v___x_2680_; 
v___x_2679_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__36));
v___x_2680_ = lean_string_dec_eq(v_value_2553_, v___x_2679_);
if (v___x_2680_ == 0)
{
lean_object* v___x_2681_; uint8_t v___x_2682_; 
v___x_2681_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__6));
v___x_2682_ = lean_string_dec_eq(v_value_2553_, v___x_2681_);
if (v___x_2682_ == 0)
{
lean_object* v___x_2683_; uint8_t v___x_2684_; 
v___x_2683_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__7));
v___x_2684_ = lean_string_dec_eq(v_value_2553_, v___x_2683_);
if (v___x_2684_ == 0)
{
lean_object* v___x_2685_; uint8_t v___x_2686_; 
v___x_2685_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__8));
v___x_2686_ = lean_string_dec_eq(v_value_2553_, v___x_2685_);
if (v___x_2686_ == 0)
{
lean_object* v___x_2687_; uint8_t v___x_2688_; 
v___x_2687_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__9));
v___x_2688_ = lean_string_dec_eq(v_value_2553_, v___x_2687_);
if (v___x_2688_ == 0)
{
lean_object* v___x_2689_; uint8_t v___x_2690_; 
v___x_2689_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__10));
v___x_2690_ = lean_string_dec_eq(v_value_2553_, v___x_2689_);
if (v___x_2690_ == 0)
{
lean_object* v___x_2691_; uint8_t v___x_2692_; 
v___x_2691_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__11));
v___x_2692_ = lean_string_dec_eq(v_value_2553_, v___x_2691_);
if (v___x_2692_ == 0)
{
lean_object* v___x_2693_; uint8_t v___x_2694_; 
lean_dec(v___x_2554_);
lean_dec(v_rest_2552_);
lean_dec(v_scope_2515_);
v___x_2693_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__37));
v___x_2694_ = lean_string_dec_eq(v_value_2553_, v___x_2693_);
if (v___x_2694_ == 0)
{
lean_object* v___x_2695_; uint8_t v___x_2696_; 
v___x_2695_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__38));
v___x_2696_ = lean_string_dec_eq(v_value_2553_, v___x_2695_);
if (v___x_2696_ == 0)
{
lean_object* v___x_2697_; uint8_t v___x_2698_; 
v___x_2697_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__39));
v___x_2698_ = lean_string_dec_eq(v_value_2553_, v___x_2697_);
if (v___x_2698_ == 0)
{
lean_object* v___x_2699_; lean_object* v___x_2700_; 
v___x_2699_ = lp_algalVerification_Algal_Expr_errOp(v_value_2553_);
v___x_2700_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_2699_);
v___y_2572_ = v___x_2700_;
goto v___jp_2571_;
}
else
{
lean_object* v___x_2701_; lean_object* v___x_2702_; 
v___x_2701_ = lean_box(0);
v___x_2702_ = lp_algalVerification_Algal_Expr_machine___lam__17(v_value_2553_, v___x_2701_);
v___y_2572_ = v___x_2702_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_2703_; lean_object* v___x_2704_; 
v___x_2703_ = lean_box(0);
v___x_2704_ = lp_algalVerification_Algal_Expr_machine___lam__17(v_value_2553_, v___x_2703_);
v___y_2572_ = v___x_2704_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_2705_; lean_object* v___x_2706_; 
v___x_2705_ = lean_box(0);
v___x_2706_ = lp_algalVerification_Algal_Expr_machine___lam__17(v_value_2553_, v___x_2705_);
v___y_2572_ = v___x_2706_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_2707_; lean_object* v___x_2708_; 
v___x_2707_ = lean_box(0);
v___x_2708_ = lp_algalVerification_Algal_Expr_machine___lam__16(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_2707_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_2708_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_2709_; lean_object* v___x_2710_; 
v___x_2709_ = lean_box(0);
v___x_2710_ = lp_algalVerification_Algal_Expr_machine___lam__16(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_2709_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_2710_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_2711_; lean_object* v___x_2712_; 
v___x_2711_ = lean_box(0);
v___x_2712_ = lp_algalVerification_Algal_Expr_machine___lam__16(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_2711_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_2712_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_2713_; lean_object* v___x_2714_; 
v___x_2713_ = lean_box(0);
v___x_2714_ = lp_algalVerification_Algal_Expr_machine___lam__16(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_2713_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_2714_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_2715_; lean_object* v___x_2716_; 
v___x_2715_ = lean_box(0);
v___x_2716_ = lp_algalVerification_Algal_Expr_machine___lam__16(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_2715_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_2716_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_2717_; lean_object* v___x_2718_; 
v___x_2717_ = lean_box(0);
v___x_2718_ = lp_algalVerification_Algal_Expr_machine___lam__16(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_2717_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_2718_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_2719_; lean_object* v___x_2720_; lean_object* v___x_2721_; lean_object* v_result_2723_; lean_object* v_charges_2724_; lean_object* v_result_2727_; lean_object* v___x_2728_; 
lean_dec(v___x_2554_);
v___x_2719_ = lean_unsigned_to_nat(1u);
v___x_2720_ = lean_box(0);
lean_inc_ref(v_value_2553_);
v___x_2721_ = lp_algalVerification_Algal_Expr_checkArity(v_value_2553_, v_rest_2552_, v___x_2719_, v___x_2720_);
v_result_2727_ = lean_ctor_get(v___x_2721_, 0);
lean_inc_ref(v_result_2727_);
lean_dec_ref(v___x_2721_);
v___x_2728_ = lean_box(0);
if (lean_obj_tag(v_result_2727_) == 0)
{
lean_object* v_a_2729_; lean_object* v___x_2731_; uint8_t v_isShared_2732_; uint8_t v_isSharedCheck_2736_; 
lean_dec_ref(v_value_2553_);
lean_dec(v_rest_2552_);
lean_dec(v_scope_2515_);
v_a_2729_ = lean_ctor_get(v_result_2727_, 0);
v_isSharedCheck_2736_ = !lean_is_exclusive(v_result_2727_);
if (v_isSharedCheck_2736_ == 0)
{
v___x_2731_ = v_result_2727_;
v_isShared_2732_ = v_isSharedCheck_2736_;
goto v_resetjp_2730_;
}
else
{
lean_inc(v_a_2729_);
lean_dec(v_result_2727_);
v___x_2731_ = lean_box(0);
v_isShared_2732_ = v_isSharedCheck_2736_;
goto v_resetjp_2730_;
}
v_resetjp_2730_:
{
lean_object* v___x_2734_; 
if (v_isShared_2732_ == 0)
{
v___x_2734_ = v___x_2731_;
goto v_reusejp_2733_;
}
else
{
lean_object* v_reuseFailAlloc_2735_; 
v_reuseFailAlloc_2735_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2735_, 0, v_a_2729_);
v___x_2734_ = v_reuseFailAlloc_2735_;
goto v_reusejp_2733_;
}
v_reusejp_2733_:
{
v_result_2558_ = v___x_2734_;
v_charges_2559_ = v___x_2728_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_2737_; lean_object* v___x_2738_; lean_object* v___x_2739_; lean_object* v___x_2740_; lean_object* v___y_2742_; lean_object* v_result_2747_; 
lean_dec_ref_known(v_result_2727_, 1);
v___x_2737_ = lean_box(0);
v___x_2738_ = lean_unsigned_to_nat(2u);
v___x_2739_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v___x_2739_, 0, v_rest_2552_);
lean_ctor_set(v___x_2739_, 1, v___x_2737_);
lean_ctor_set(v___x_2739_, 2, v___x_2738_);
v___x_2740_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_2739_);
v_result_2747_ = lean_ctor_get(v___x_2740_, 0);
lean_inc_ref(v_result_2747_);
if (lean_obj_tag(v_result_2747_) == 0)
{
lean_object* v_charges_2748_; 
lean_dec_ref(v_value_2553_);
v_charges_2748_ = lean_ctor_get(v___x_2740_, 1);
lean_inc(v_charges_2748_);
lean_dec_ref(v___x_2740_);
v_result_2723_ = v_result_2747_;
v_charges_2724_ = v_charges_2748_;
goto v___jp_2722_;
}
else
{
lean_object* v_a_2749_; 
v_a_2749_ = lean_ctor_get(v_result_2747_, 0);
lean_inc(v_a_2749_);
lean_dec_ref_known(v_result_2747_, 1);
if (lean_obj_tag(v_a_2749_) == 4)
{
lean_object* v_values_2750_; lean_object* v___x_2752_; uint8_t v_isShared_2753_; uint8_t v_isSharedCheck_2768_; 
v_values_2750_ = lean_ctor_get(v_a_2749_, 0);
v_isSharedCheck_2768_ = !lean_is_exclusive(v_a_2749_);
if (v_isSharedCheck_2768_ == 0)
{
v___x_2752_ = v_a_2749_;
v_isShared_2753_ = v_isSharedCheck_2768_;
goto v_resetjp_2751_;
}
else
{
lean_inc(v_values_2750_);
lean_dec(v_a_2749_);
v___x_2752_ = lean_box(0);
v_isShared_2753_ = v_isSharedCheck_2768_;
goto v_resetjp_2751_;
}
v_resetjp_2751_:
{
lean_object* v___x_2754_; lean_object* v___x_2755_; lean_object* v___x_2756_; lean_object* v_fst_2757_; 
v___x_2754_ = lean_box(0);
v___x_2755_ = lean_unsigned_to_nat(0u);
v___x_2756_ = lp_algalVerification_Algal_Expr_mergeLoop(v_value_2553_, v_values_2750_, v___x_2754_, v___x_2755_);
v_fst_2757_ = lean_ctor_get(v___x_2756_, 0);
lean_inc(v_fst_2757_);
if (lean_obj_tag(v_fst_2757_) == 0)
{
lean_object* v_snd_2758_; lean_object* v_a_2759_; lean_object* v___x_2760_; 
lean_del_object(v___x_2752_);
v_snd_2758_ = lean_ctor_get(v___x_2756_, 1);
lean_inc(v_snd_2758_);
lean_dec_ref(v___x_2756_);
v_a_2759_ = lean_ctor_get(v_fst_2757_, 0);
lean_inc(v_a_2759_);
lean_dec_ref_known(v_fst_2757_, 1);
v___x_2760_ = lp_algalVerification_Algal_Expr_failWith___redArg(v_a_2759_, v_snd_2758_);
v___y_2742_ = v___x_2760_;
goto v___jp_2741_;
}
else
{
lean_object* v_snd_2761_; lean_object* v_a_2762_; lean_object* v___x_2763_; lean_object* v___x_2765_; 
v_snd_2761_ = lean_ctor_get(v___x_2756_, 1);
lean_inc(v_snd_2761_);
lean_dec_ref(v___x_2756_);
v_a_2762_ = lean_ctor_get(v_fst_2757_, 0);
lean_inc(v_a_2762_);
lean_dec_ref_known(v_fst_2757_, 1);
v___x_2763_ = lp_algalVerification_Algal_Core_Normalize_canonicalFields(v_a_2762_);
lean_dec(v_a_2762_);
if (v_isShared_2753_ == 0)
{
lean_ctor_set_tag(v___x_2752_, 5);
lean_ctor_set(v___x_2752_, 0, v___x_2763_);
v___x_2765_ = v___x_2752_;
goto v_reusejp_2764_;
}
else
{
lean_object* v_reuseFailAlloc_2767_; 
v_reuseFailAlloc_2767_ = lean_alloc_ctor(5, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2767_, 0, v___x_2763_);
v___x_2765_ = v_reuseFailAlloc_2767_;
goto v_reusejp_2764_;
}
v_reusejp_2764_:
{
lean_object* v___x_2766_; 
v___x_2766_ = lp_algalVerification_Algal_Expr_charged___redArg(v___x_2765_, v_snd_2761_);
v___y_2742_ = v___x_2766_;
goto v___jp_2741_;
}
}
}
}
else
{
lean_object* v___x_2769_; 
lean_dec(v_a_2749_);
lean_dec_ref(v_value_2553_);
v___x_2769_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__6___closed__0, &lp_algalVerification_Algal_Expr_machine___lam__6___closed__0_once, _init_lp_algalVerification_Algal_Expr_machine___lam__6___closed__0);
v___y_2742_ = v___x_2769_;
goto v___jp_2741_;
}
}
v___jp_2741_:
{
lean_object* v_result_2743_; lean_object* v_charges_2744_; lean_object* v_charges_2745_; lean_object* v___x_2746_; 
v_result_2743_ = lean_ctor_get(v___y_2742_, 0);
lean_inc_ref(v_result_2743_);
v_charges_2744_ = lean_ctor_get(v___y_2742_, 1);
lean_inc(v_charges_2744_);
lean_dec_ref(v___y_2742_);
v_charges_2745_ = lean_ctor_get(v___x_2740_, 1);
lean_inc(v_charges_2745_);
lean_dec_ref(v___x_2740_);
v___x_2746_ = l_List_appendTR___redArg(v_charges_2745_, v_charges_2744_);
v_result_2723_ = v_result_2743_;
v_charges_2724_ = v___x_2746_;
goto v___jp_2722_;
}
}
v___jp_2722_:
{
lean_object* v___x_2725_; lean_object* v___x_2726_; 
v___x_2725_ = lean_box(0);
v___x_2726_ = l_List_appendTR___redArg(v___x_2725_, v_charges_2724_);
v_result_2558_ = v_result_2723_;
v_charges_2559_ = v___x_2726_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_2770_; lean_object* v___x_2771_; 
v___x_2770_ = lean_box(0);
v___x_2771_ = lp_algalVerification_Algal_Expr_machine___lam__15(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_2770_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_2771_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_2772_; lean_object* v___x_2773_; 
v___x_2772_ = lean_box(0);
v___x_2773_ = lp_algalVerification_Algal_Expr_machine___lam__15(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_2772_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_2773_;
goto v___jp_2571_;
}
}
else
{
if (lean_obj_tag(v_rest_2552_) == 1)
{
lean_object* v_rest_2774_; 
v_rest_2774_ = lean_ctor_get(v_rest_2552_, 1);
if (lean_obj_tag(v_rest_2774_) == 1)
{
lean_object* v_rest_2775_; 
v_rest_2775_ = lean_ctor_get(v_rest_2774_, 1);
if (lean_obj_tag(v_rest_2775_) == 0)
{
lean_object* v_value_2776_; lean_object* v_value_2777_; lean_object* v___x_2779_; 
lean_inc_ref(v_rest_2774_);
lean_dec(v___x_2554_);
v_value_2776_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_2776_);
lean_dec_ref_known(v_rest_2552_, 2);
v_value_2777_ = lean_ctor_get(v_rest_2774_, 0);
lean_inc(v_value_2777_);
lean_dec_ref_known(v_rest_2774_, 2);
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_2776_);
v___x_2779_ = v___x_2519_;
goto v_reusejp_2778_;
}
else
{
lean_object* v_reuseFailAlloc_2845_; 
v_reuseFailAlloc_2845_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2845_, 0, v_value_2776_);
v___x_2779_ = v_reuseFailAlloc_2845_;
goto v_reusejp_2778_;
}
v_reusejp_2778_:
{
lean_object* v___x_2780_; lean_object* v_result_2782_; lean_object* v_charges_2783_; lean_object* v_result_2786_; 
lean_inc(v_scope_2515_);
v___x_2780_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_2779_);
v_result_2786_ = lean_ctor_get(v___x_2780_, 0);
lean_inc_ref(v_result_2786_);
if (lean_obj_tag(v_result_2786_) == 0)
{
lean_object* v_charges_2787_; 
lean_dec(v_value_2777_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_charges_2787_ = lean_ctor_get(v___x_2780_, 1);
lean_inc(v_charges_2787_);
lean_dec_ref(v___x_2780_);
v_result_2558_ = v_result_2786_;
v_charges_2559_ = v_charges_2787_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_2788_; lean_object* v___x_2790_; uint8_t v_isShared_2791_; uint8_t v_isSharedCheck_2844_; 
v_a_2788_ = lean_ctor_get(v_result_2786_, 0);
v_isSharedCheck_2844_ = !lean_is_exclusive(v_result_2786_);
if (v_isSharedCheck_2844_ == 0)
{
v___x_2790_ = v_result_2786_;
v_isShared_2791_ = v_isSharedCheck_2844_;
goto v_resetjp_2789_;
}
else
{
lean_inc(v_a_2788_);
lean_dec(v_result_2786_);
v___x_2790_ = lean_box(0);
v_isShared_2791_ = v_isSharedCheck_2844_;
goto v_resetjp_2789_;
}
v_resetjp_2789_:
{
lean_object* v___x_2792_; lean_object* v___x_2793_; lean_object* v_result_2795_; lean_object* v_charges_2796_; lean_object* v_result_2799_; lean_object* v___x_2800_; 
v___x_2792_ = lean_unsigned_to_nat(0u);
lean_inc_ref(v_value_2553_);
v___x_2793_ = lp_algalVerification_Algal_Expr_asMap(v_value_2553_, v___x_2792_, v_a_2788_);
v_result_2799_ = lean_ctor_get(v___x_2793_, 0);
lean_inc_ref(v_result_2799_);
lean_dec_ref(v___x_2793_);
v___x_2800_ = lean_box(0);
if (lean_obj_tag(v_result_2799_) == 0)
{
lean_object* v_a_2801_; lean_object* v___x_2803_; uint8_t v_isShared_2804_; uint8_t v_isSharedCheck_2808_; 
lean_del_object(v___x_2790_);
lean_dec(v_value_2777_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_a_2801_ = lean_ctor_get(v_result_2799_, 0);
v_isSharedCheck_2808_ = !lean_is_exclusive(v_result_2799_);
if (v_isSharedCheck_2808_ == 0)
{
v___x_2803_ = v_result_2799_;
v_isShared_2804_ = v_isSharedCheck_2808_;
goto v_resetjp_2802_;
}
else
{
lean_inc(v_a_2801_);
lean_dec(v_result_2799_);
v___x_2803_ = lean_box(0);
v_isShared_2804_ = v_isSharedCheck_2808_;
goto v_resetjp_2802_;
}
v_resetjp_2802_:
{
lean_object* v___x_2806_; 
if (v_isShared_2804_ == 0)
{
v___x_2806_ = v___x_2803_;
goto v_reusejp_2805_;
}
else
{
lean_object* v_reuseFailAlloc_2807_; 
v_reuseFailAlloc_2807_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2807_, 0, v_a_2801_);
v___x_2806_ = v_reuseFailAlloc_2807_;
goto v_reusejp_2805_;
}
v_reusejp_2805_:
{
v_result_2782_ = v___x_2806_;
v_charges_2783_ = v___x_2800_;
goto v___jp_2781_;
}
}
}
else
{
lean_object* v_a_2809_; lean_object* v___x_2811_; 
v_a_2809_ = lean_ctor_get(v_result_2799_, 0);
lean_inc(v_a_2809_);
lean_dec_ref_known(v_result_2799_, 1);
if (v_isShared_2791_ == 0)
{
lean_ctor_set_tag(v___x_2790_, 0);
lean_ctor_set(v___x_2790_, 0, v_value_2777_);
v___x_2811_ = v___x_2790_;
goto v_reusejp_2810_;
}
else
{
lean_object* v_reuseFailAlloc_2843_; 
v_reuseFailAlloc_2843_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2843_, 0, v_value_2777_);
v___x_2811_ = v_reuseFailAlloc_2843_;
goto v_reusejp_2810_;
}
v_reusejp_2810_:
{
lean_object* v___x_2812_; lean_object* v_result_2814_; lean_object* v_charges_2815_; lean_object* v_result_2818_; 
v___x_2812_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_2811_);
v_result_2818_ = lean_ctor_get(v___x_2812_, 0);
lean_inc_ref(v_result_2818_);
if (lean_obj_tag(v_result_2818_) == 0)
{
lean_object* v_charges_2819_; 
lean_dec(v_a_2809_);
lean_dec_ref(v_value_2553_);
v_charges_2819_ = lean_ctor_get(v___x_2812_, 1);
lean_inc(v_charges_2819_);
lean_dec_ref(v___x_2812_);
v_result_2795_ = v_result_2818_;
v_charges_2796_ = v_charges_2819_;
goto v___jp_2794_;
}
else
{
lean_object* v_a_2820_; lean_object* v___x_2821_; lean_object* v___x_2822_; lean_object* v_result_2823_; 
v_a_2820_ = lean_ctor_get(v_result_2818_, 0);
lean_inc(v_a_2820_);
lean_dec_ref_known(v_result_2818_, 1);
v___x_2821_ = lean_unsigned_to_nat(1u);
v___x_2822_ = lp_algalVerification_Algal_Expr_asStr(v_value_2553_, v___x_2821_, v_a_2820_);
v_result_2823_ = lean_ctor_get(v___x_2822_, 0);
lean_inc_ref(v_result_2823_);
lean_dec_ref(v___x_2822_);
if (lean_obj_tag(v_result_2823_) == 0)
{
lean_object* v_a_2824_; lean_object* v___x_2826_; uint8_t v_isShared_2827_; uint8_t v_isSharedCheck_2831_; 
lean_dec(v_a_2809_);
v_a_2824_ = lean_ctor_get(v_result_2823_, 0);
v_isSharedCheck_2831_ = !lean_is_exclusive(v_result_2823_);
if (v_isSharedCheck_2831_ == 0)
{
v___x_2826_ = v_result_2823_;
v_isShared_2827_ = v_isSharedCheck_2831_;
goto v_resetjp_2825_;
}
else
{
lean_inc(v_a_2824_);
lean_dec(v_result_2823_);
v___x_2826_ = lean_box(0);
v_isShared_2827_ = v_isSharedCheck_2831_;
goto v_resetjp_2825_;
}
v_resetjp_2825_:
{
lean_object* v___x_2829_; 
if (v_isShared_2827_ == 0)
{
v___x_2829_ = v___x_2826_;
goto v_reusejp_2828_;
}
else
{
lean_object* v_reuseFailAlloc_2830_; 
v_reuseFailAlloc_2830_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2830_, 0, v_a_2824_);
v___x_2829_ = v_reuseFailAlloc_2830_;
goto v_reusejp_2828_;
}
v_reusejp_2828_:
{
v_result_2814_ = v___x_2829_;
v_charges_2815_ = v___x_2800_;
goto v___jp_2813_;
}
}
}
else
{
lean_object* v_a_2832_; lean_object* v___x_2834_; uint8_t v_isShared_2835_; uint8_t v_isSharedCheck_2842_; 
v_a_2832_ = lean_ctor_get(v_result_2823_, 0);
v_isSharedCheck_2842_ = !lean_is_exclusive(v_result_2823_);
if (v_isSharedCheck_2842_ == 0)
{
v___x_2834_ = v_result_2823_;
v_isShared_2835_ = v_isSharedCheck_2842_;
goto v_resetjp_2833_;
}
else
{
lean_inc(v_a_2832_);
lean_dec(v_result_2823_);
v___x_2834_ = lean_box(0);
v_isShared_2835_ = v_isSharedCheck_2842_;
goto v_resetjp_2833_;
}
v_resetjp_2833_:
{
uint8_t v___x_2836_; lean_object* v___x_2837_; lean_object* v___x_2839_; 
v___x_2836_ = lp_algalVerification_Algal_Expr_fhas(v_a_2809_, v_a_2832_);
lean_dec(v_a_2832_);
lean_dec(v_a_2809_);
v___x_2837_ = lean_alloc_ctor(1, 0, 1);
lean_ctor_set_uint8(v___x_2837_, 0, v___x_2836_);
if (v_isShared_2835_ == 0)
{
lean_ctor_set(v___x_2834_, 0, v___x_2837_);
v___x_2839_ = v___x_2834_;
goto v_reusejp_2838_;
}
else
{
lean_object* v_reuseFailAlloc_2841_; 
v_reuseFailAlloc_2841_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2841_, 0, v___x_2837_);
v___x_2839_ = v_reuseFailAlloc_2841_;
goto v_reusejp_2838_;
}
v_reusejp_2838_:
{
lean_object* v___x_2840_; 
v___x_2840_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__4___closed__1, &lp_algalVerification_Algal_Expr_machine___lam__4___closed__1_once, _init_lp_algalVerification_Algal_Expr_machine___lam__4___closed__1);
v_result_2814_ = v___x_2839_;
v_charges_2815_ = v___x_2840_;
goto v___jp_2813_;
}
}
}
}
v___jp_2813_:
{
lean_object* v_charges_2816_; lean_object* v___x_2817_; 
v_charges_2816_ = lean_ctor_get(v___x_2812_, 1);
lean_inc(v_charges_2816_);
lean_dec_ref(v___x_2812_);
v___x_2817_ = l_List_appendTR___redArg(v_charges_2816_, v_charges_2815_);
v_result_2795_ = v_result_2814_;
v_charges_2796_ = v___x_2817_;
goto v___jp_2794_;
}
}
}
v___jp_2794_:
{
lean_object* v___x_2797_; lean_object* v___x_2798_; 
v___x_2797_ = lean_box(0);
v___x_2798_ = l_List_appendTR___redArg(v___x_2797_, v_charges_2796_);
v_result_2782_ = v_result_2795_;
v_charges_2783_ = v___x_2798_;
goto v___jp_2781_;
}
}
}
v___jp_2781_:
{
lean_object* v_charges_2784_; lean_object* v___x_2785_; 
v_charges_2784_ = lean_ctor_get(v___x_2780_, 1);
lean_inc(v_charges_2784_);
lean_dec_ref(v___x_2780_);
v___x_2785_ = l_List_appendTR___redArg(v_charges_2784_, v_charges_2783_);
v_result_2558_ = v_result_2782_;
v_charges_2559_ = v___x_2785_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_2846_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_2846_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_2846_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_2847_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_2847_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_2847_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_2848_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_2848_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_2848_;
goto v___jp_2571_;
}
}
}
else
{
lean_object* v___x_2849_; lean_object* v___x_2850_; 
lean_del_object(v___x_2519_);
v___x_2849_ = lean_box(0);
v___x_2850_ = lp_algalVerification_Algal_Expr_machine___lam__14(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_2849_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_2850_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_2851_; lean_object* v___x_2852_; 
lean_del_object(v___x_2519_);
v___x_2851_ = lean_box(0);
v___x_2852_ = lp_algalVerification_Algal_Expr_machine___lam__14(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_2851_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_2852_;
goto v___jp_2571_;
}
}
else
{
if (lean_obj_tag(v_rest_2552_) == 1)
{
lean_object* v_rest_2853_; 
v_rest_2853_ = lean_ctor_get(v_rest_2552_, 1);
if (lean_obj_tag(v_rest_2853_) == 1)
{
lean_object* v_rest_2854_; 
v_rest_2854_ = lean_ctor_get(v_rest_2853_, 1);
if (lean_obj_tag(v_rest_2854_) == 0)
{
lean_object* v_value_2855_; lean_object* v_value_2856_; lean_object* v___x_2858_; 
lean_inc_ref(v_rest_2853_);
lean_dec(v___x_2554_);
v_value_2855_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_2855_);
lean_dec_ref_known(v_rest_2552_, 2);
v_value_2856_ = lean_ctor_get(v_rest_2853_, 0);
lean_inc(v_value_2856_);
lean_dec_ref_known(v_rest_2853_, 2);
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_2855_);
v___x_2858_ = v___x_2519_;
goto v_reusejp_2857_;
}
else
{
lean_object* v_reuseFailAlloc_2935_; 
v_reuseFailAlloc_2935_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2935_, 0, v_value_2855_);
v___x_2858_ = v_reuseFailAlloc_2935_;
goto v_reusejp_2857_;
}
v_reusejp_2857_:
{
lean_object* v___x_2859_; lean_object* v_result_2861_; lean_object* v_charges_2862_; lean_object* v_result_2865_; 
lean_inc(v_scope_2515_);
v___x_2859_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_2858_);
v_result_2865_ = lean_ctor_get(v___x_2859_, 0);
lean_inc_ref(v_result_2865_);
if (lean_obj_tag(v_result_2865_) == 0)
{
lean_object* v_charges_2866_; 
lean_dec(v_value_2856_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_charges_2866_ = lean_ctor_get(v___x_2859_, 1);
lean_inc(v_charges_2866_);
lean_dec_ref(v___x_2859_);
v_result_2558_ = v_result_2865_;
v_charges_2559_ = v_charges_2866_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_2867_; lean_object* v___x_2869_; uint8_t v_isShared_2870_; uint8_t v_isSharedCheck_2934_; 
v_a_2867_ = lean_ctor_get(v_result_2865_, 0);
v_isSharedCheck_2934_ = !lean_is_exclusive(v_result_2865_);
if (v_isSharedCheck_2934_ == 0)
{
v___x_2869_ = v_result_2865_;
v_isShared_2870_ = v_isSharedCheck_2934_;
goto v_resetjp_2868_;
}
else
{
lean_inc(v_a_2867_);
lean_dec(v_result_2865_);
v___x_2869_ = lean_box(0);
v_isShared_2870_ = v_isSharedCheck_2934_;
goto v_resetjp_2868_;
}
v_resetjp_2868_:
{
lean_object* v___x_2871_; lean_object* v___x_2872_; lean_object* v_result_2874_; lean_object* v_charges_2875_; lean_object* v_result_2878_; lean_object* v___x_2879_; 
v___x_2871_ = lean_unsigned_to_nat(0u);
lean_inc_ref(v_value_2553_);
v___x_2872_ = lp_algalVerification_Algal_Expr_asStr(v_value_2553_, v___x_2871_, v_a_2867_);
v_result_2878_ = lean_ctor_get(v___x_2872_, 0);
lean_inc_ref(v_result_2878_);
lean_dec_ref(v___x_2872_);
v___x_2879_ = lean_box(0);
if (lean_obj_tag(v_result_2878_) == 0)
{
lean_object* v_a_2880_; lean_object* v___x_2882_; uint8_t v_isShared_2883_; uint8_t v_isSharedCheck_2887_; 
lean_del_object(v___x_2869_);
lean_dec(v_value_2856_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_a_2880_ = lean_ctor_get(v_result_2878_, 0);
v_isSharedCheck_2887_ = !lean_is_exclusive(v_result_2878_);
if (v_isSharedCheck_2887_ == 0)
{
v___x_2882_ = v_result_2878_;
v_isShared_2883_ = v_isSharedCheck_2887_;
goto v_resetjp_2881_;
}
else
{
lean_inc(v_a_2880_);
lean_dec(v_result_2878_);
v___x_2882_ = lean_box(0);
v_isShared_2883_ = v_isSharedCheck_2887_;
goto v_resetjp_2881_;
}
v_resetjp_2881_:
{
lean_object* v___x_2885_; 
if (v_isShared_2883_ == 0)
{
v___x_2885_ = v___x_2882_;
goto v_reusejp_2884_;
}
else
{
lean_object* v_reuseFailAlloc_2886_; 
v_reuseFailAlloc_2886_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2886_, 0, v_a_2880_);
v___x_2885_ = v_reuseFailAlloc_2886_;
goto v_reusejp_2884_;
}
v_reusejp_2884_:
{
v_result_2861_ = v___x_2885_;
v_charges_2862_ = v___x_2879_;
goto v___jp_2860_;
}
}
}
else
{
lean_object* v_a_2888_; lean_object* v___x_2890_; 
v_a_2888_ = lean_ctor_get(v_result_2878_, 0);
lean_inc(v_a_2888_);
lean_dec_ref_known(v_result_2878_, 1);
if (v_isShared_2870_ == 0)
{
lean_ctor_set_tag(v___x_2869_, 0);
lean_ctor_set(v___x_2869_, 0, v_value_2856_);
v___x_2890_ = v___x_2869_;
goto v_reusejp_2889_;
}
else
{
lean_object* v_reuseFailAlloc_2933_; 
v_reuseFailAlloc_2933_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2933_, 0, v_value_2856_);
v___x_2890_ = v_reuseFailAlloc_2933_;
goto v_reusejp_2889_;
}
v_reusejp_2889_:
{
lean_object* v___x_2891_; lean_object* v_result_2893_; lean_object* v_charges_2894_; lean_object* v_result_2897_; 
v___x_2891_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_2890_);
v_result_2897_ = lean_ctor_get(v___x_2891_, 0);
lean_inc_ref(v_result_2897_);
if (lean_obj_tag(v_result_2897_) == 0)
{
lean_object* v_charges_2898_; 
lean_dec(v_a_2888_);
lean_dec_ref(v_value_2553_);
v_charges_2898_ = lean_ctor_get(v___x_2891_, 1);
lean_inc(v_charges_2898_);
lean_dec_ref(v___x_2891_);
v_result_2874_ = v_result_2897_;
v_charges_2875_ = v_charges_2898_;
goto v___jp_2873_;
}
else
{
lean_object* v_a_2899_; lean_object* v___x_2900_; lean_object* v___x_2901_; lean_object* v_result_2903_; lean_object* v_charges_2904_; lean_object* v_result_2906_; 
v_a_2899_ = lean_ctor_get(v_result_2897_, 0);
lean_inc(v_a_2899_);
lean_dec_ref_known(v_result_2897_, 1);
v___x_2900_ = lean_unsigned_to_nat(1u);
v___x_2901_ = lp_algalVerification_Algal_Expr_asStr(v_value_2553_, v___x_2900_, v_a_2899_);
v_result_2906_ = lean_ctor_get(v___x_2901_, 0);
lean_inc_ref(v_result_2906_);
lean_dec_ref(v___x_2901_);
if (lean_obj_tag(v_result_2906_) == 0)
{
lean_object* v_a_2907_; lean_object* v___x_2909_; uint8_t v_isShared_2910_; uint8_t v_isSharedCheck_2914_; 
lean_dec(v_a_2888_);
v_a_2907_ = lean_ctor_get(v_result_2906_, 0);
v_isSharedCheck_2914_ = !lean_is_exclusive(v_result_2906_);
if (v_isSharedCheck_2914_ == 0)
{
v___x_2909_ = v_result_2906_;
v_isShared_2910_ = v_isSharedCheck_2914_;
goto v_resetjp_2908_;
}
else
{
lean_inc(v_a_2907_);
lean_dec(v_result_2906_);
v___x_2909_ = lean_box(0);
v_isShared_2910_ = v_isSharedCheck_2914_;
goto v_resetjp_2908_;
}
v_resetjp_2908_:
{
lean_object* v___x_2912_; 
if (v_isShared_2910_ == 0)
{
v___x_2912_ = v___x_2909_;
goto v_reusejp_2911_;
}
else
{
lean_object* v_reuseFailAlloc_2913_; 
v_reuseFailAlloc_2913_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2913_, 0, v_a_2907_);
v___x_2912_ = v_reuseFailAlloc_2913_;
goto v_reusejp_2911_;
}
v_reusejp_2911_:
{
v_result_2893_ = v___x_2912_;
v_charges_2894_ = v___x_2879_;
goto v___jp_2892_;
}
}
}
else
{
lean_object* v_a_2915_; lean_object* v___x_2916_; lean_object* v___x_2917_; lean_object* v_result_2918_; lean_object* v_charges_2919_; lean_object* v___x_2921_; uint8_t v_isShared_2922_; uint8_t v_isSharedCheck_2931_; 
v_a_2915_ = lean_ctor_get(v_result_2906_, 0);
lean_inc(v_a_2915_);
lean_dec_ref_known(v_result_2906_, 1);
v___x_2916_ = lean_string_utf8_byte_size(v_a_2888_);
v___x_2917_ = lp_algalVerification_Algal_Expr_charge(v___x_2916_);
v_result_2918_ = lean_ctor_get(v___x_2917_, 0);
lean_inc_ref(v_result_2918_);
v_charges_2919_ = lean_ctor_get(v___x_2917_, 1);
lean_inc(v_charges_2919_);
lean_dec_ref(v___x_2917_);
v_isSharedCheck_2931_ = !lean_is_exclusive(v_result_2918_);
if (v_isSharedCheck_2931_ == 0)
{
lean_object* v_unused_2932_; 
v_unused_2932_ = lean_ctor_get(v_result_2918_, 0);
lean_dec(v_unused_2932_);
v___x_2921_ = v_result_2918_;
v_isShared_2922_ = v_isSharedCheck_2931_;
goto v_resetjp_2920_;
}
else
{
lean_dec(v_result_2918_);
v___x_2921_ = lean_box(0);
v_isShared_2922_ = v_isSharedCheck_2931_;
goto v_resetjp_2920_;
}
v_resetjp_2920_:
{
lean_object* v___x_2923_; lean_object* v___x_2924_; uint8_t v___x_2925_; lean_object* v___x_2926_; lean_object* v___x_2928_; 
v___x_2923_ = lean_string_data(v_a_2888_);
v___x_2924_ = lean_string_data(v_a_2915_);
v___x_2925_ = lp_algalVerification_Algal_Expr_charInfix(v___x_2923_, v___x_2924_);
lean_dec(v___x_2924_);
lean_dec(v___x_2923_);
v___x_2926_ = lean_alloc_ctor(1, 0, 1);
lean_ctor_set_uint8(v___x_2926_, 0, v___x_2925_);
if (v_isShared_2922_ == 0)
{
lean_ctor_set(v___x_2921_, 0, v___x_2926_);
v___x_2928_ = v___x_2921_;
goto v_reusejp_2927_;
}
else
{
lean_object* v_reuseFailAlloc_2930_; 
v_reuseFailAlloc_2930_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2930_, 0, v___x_2926_);
v___x_2928_ = v_reuseFailAlloc_2930_;
goto v_reusejp_2927_;
}
v_reusejp_2927_:
{
lean_object* v___x_2929_; 
v___x_2929_ = l_List_appendTR___redArg(v_charges_2919_, v___x_2879_);
v_result_2903_ = v___x_2928_;
v_charges_2904_ = v___x_2929_;
goto v___jp_2902_;
}
}
}
v___jp_2902_:
{
lean_object* v___x_2905_; 
v___x_2905_ = l_List_appendTR___redArg(v___x_2879_, v_charges_2904_);
v_result_2893_ = v_result_2903_;
v_charges_2894_ = v___x_2905_;
goto v___jp_2892_;
}
}
v___jp_2892_:
{
lean_object* v_charges_2895_; lean_object* v___x_2896_; 
v_charges_2895_ = lean_ctor_get(v___x_2891_, 1);
lean_inc(v_charges_2895_);
lean_dec_ref(v___x_2891_);
v___x_2896_ = l_List_appendTR___redArg(v_charges_2895_, v_charges_2894_);
v_result_2874_ = v_result_2893_;
v_charges_2875_ = v___x_2896_;
goto v___jp_2873_;
}
}
}
v___jp_2873_:
{
lean_object* v___x_2876_; lean_object* v___x_2877_; 
v___x_2876_ = lean_box(0);
v___x_2877_ = l_List_appendTR___redArg(v___x_2876_, v_charges_2875_);
v_result_2861_ = v_result_2874_;
v_charges_2862_ = v___x_2877_;
goto v___jp_2860_;
}
}
}
v___jp_2860_:
{
lean_object* v_charges_2863_; lean_object* v___x_2864_; 
v_charges_2863_ = lean_ctor_get(v___x_2859_, 1);
lean_inc(v_charges_2863_);
lean_dec_ref(v___x_2859_);
v___x_2864_ = l_List_appendTR___redArg(v_charges_2863_, v_charges_2862_);
v_result_2558_ = v_result_2861_;
v_charges_2559_ = v___x_2864_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_2936_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_2936_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_2936_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_2937_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_2937_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_2937_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_2938_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_2938_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_2938_;
goto v___jp_2571_;
}
}
}
else
{
if (lean_obj_tag(v_rest_2552_) == 1)
{
lean_object* v_rest_2939_; 
v_rest_2939_ = lean_ctor_get(v_rest_2552_, 1);
if (lean_obj_tag(v_rest_2939_) == 1)
{
lean_object* v_rest_2940_; 
v_rest_2940_ = lean_ctor_get(v_rest_2939_, 1);
if (lean_obj_tag(v_rest_2940_) == 0)
{
lean_object* v_value_2941_; lean_object* v_value_2942_; lean_object* v___x_2944_; 
lean_inc_ref(v_rest_2939_);
lean_dec(v___x_2554_);
v_value_2941_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_2941_);
lean_dec_ref_known(v_rest_2552_, 2);
v_value_2942_ = lean_ctor_get(v_rest_2939_, 0);
lean_inc(v_value_2942_);
lean_dec_ref_known(v_rest_2939_, 2);
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_2941_);
v___x_2944_ = v___x_2519_;
goto v_reusejp_2943_;
}
else
{
lean_object* v_reuseFailAlloc_3046_; 
v_reuseFailAlloc_3046_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3046_, 0, v_value_2941_);
v___x_2944_ = v_reuseFailAlloc_3046_;
goto v_reusejp_2943_;
}
v_reusejp_2943_:
{
lean_object* v___x_2945_; lean_object* v_result_2947_; lean_object* v_charges_2948_; lean_object* v_result_2951_; 
lean_inc(v_scope_2515_);
v___x_2945_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_2944_);
v_result_2951_ = lean_ctor_get(v___x_2945_, 0);
lean_inc_ref(v_result_2951_);
if (lean_obj_tag(v_result_2951_) == 0)
{
lean_object* v_charges_2952_; 
lean_dec(v_value_2942_);
lean_del_object(v___x_2584_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_charges_2952_ = lean_ctor_get(v___x_2945_, 1);
lean_inc(v_charges_2952_);
lean_dec_ref(v___x_2945_);
v_result_2558_ = v_result_2951_;
v_charges_2559_ = v_charges_2952_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_2953_; lean_object* v___x_2955_; uint8_t v_isShared_2956_; uint8_t v_isSharedCheck_3045_; 
v_a_2953_ = lean_ctor_get(v_result_2951_, 0);
v_isSharedCheck_3045_ = !lean_is_exclusive(v_result_2951_);
if (v_isSharedCheck_3045_ == 0)
{
v___x_2955_ = v_result_2951_;
v_isShared_2956_ = v_isSharedCheck_3045_;
goto v_resetjp_2954_;
}
else
{
lean_inc(v_a_2953_);
lean_dec(v_result_2951_);
v___x_2955_ = lean_box(0);
v_isShared_2956_ = v_isSharedCheck_3045_;
goto v_resetjp_2954_;
}
v_resetjp_2954_:
{
lean_object* v___x_2957_; lean_object* v___x_2958_; lean_object* v_result_2960_; lean_object* v_charges_2961_; lean_object* v_result_2964_; lean_object* v___x_2965_; 
v___x_2957_ = lean_unsigned_to_nat(0u);
lean_inc_ref(v_value_2553_);
v___x_2958_ = lp_algalVerification_Algal_Expr_asList(v_value_2553_, v___x_2957_, v_a_2953_);
v_result_2964_ = lean_ctor_get(v___x_2958_, 0);
lean_inc_ref(v_result_2964_);
lean_dec_ref(v___x_2958_);
v___x_2965_ = lean_box(0);
if (lean_obj_tag(v_result_2964_) == 0)
{
lean_object* v_a_2966_; lean_object* v___x_2968_; uint8_t v_isShared_2969_; uint8_t v_isSharedCheck_2973_; 
lean_del_object(v___x_2955_);
lean_dec(v_value_2942_);
lean_del_object(v___x_2584_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_a_2966_ = lean_ctor_get(v_result_2964_, 0);
v_isSharedCheck_2973_ = !lean_is_exclusive(v_result_2964_);
if (v_isSharedCheck_2973_ == 0)
{
v___x_2968_ = v_result_2964_;
v_isShared_2969_ = v_isSharedCheck_2973_;
goto v_resetjp_2967_;
}
else
{
lean_inc(v_a_2966_);
lean_dec(v_result_2964_);
v___x_2968_ = lean_box(0);
v_isShared_2969_ = v_isSharedCheck_2973_;
goto v_resetjp_2967_;
}
v_resetjp_2967_:
{
lean_object* v___x_2971_; 
if (v_isShared_2969_ == 0)
{
v___x_2971_ = v___x_2968_;
goto v_reusejp_2970_;
}
else
{
lean_object* v_reuseFailAlloc_2972_; 
v_reuseFailAlloc_2972_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2972_, 0, v_a_2966_);
v___x_2971_ = v_reuseFailAlloc_2972_;
goto v_reusejp_2970_;
}
v_reusejp_2970_:
{
v_result_2947_ = v___x_2971_;
v_charges_2948_ = v___x_2965_;
goto v___jp_2946_;
}
}
}
else
{
lean_object* v_a_2974_; lean_object* v___x_2976_; 
v_a_2974_ = lean_ctor_get(v_result_2964_, 0);
lean_inc(v_a_2974_);
lean_dec_ref_known(v_result_2964_, 1);
if (v_isShared_2956_ == 0)
{
lean_ctor_set_tag(v___x_2955_, 0);
lean_ctor_set(v___x_2955_, 0, v_value_2942_);
v___x_2976_ = v___x_2955_;
goto v_reusejp_2975_;
}
else
{
lean_object* v_reuseFailAlloc_3044_; 
v_reuseFailAlloc_3044_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3044_, 0, v_value_2942_);
v___x_2976_ = v_reuseFailAlloc_3044_;
goto v_reusejp_2975_;
}
v_reusejp_2975_:
{
lean_object* v___x_2977_; lean_object* v_result_2979_; lean_object* v_charges_2980_; lean_object* v_result_2983_; 
v___x_2977_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_2976_);
v_result_2983_ = lean_ctor_get(v___x_2977_, 0);
lean_inc_ref(v_result_2983_);
if (lean_obj_tag(v_result_2983_) == 0)
{
lean_object* v_charges_2984_; 
lean_dec(v_a_2974_);
lean_del_object(v___x_2584_);
lean_dec_ref(v_value_2553_);
v_charges_2984_ = lean_ctor_get(v___x_2977_, 1);
lean_inc(v_charges_2984_);
lean_dec_ref(v___x_2977_);
v_result_2960_ = v_result_2983_;
v_charges_2961_ = v_charges_2984_;
goto v___jp_2959_;
}
else
{
lean_object* v_a_2985_; lean_object* v___x_2986_; lean_object* v___x_2987_; lean_object* v_result_2989_; lean_object* v_charges_2990_; lean_object* v_result_2992_; 
v_a_2985_ = lean_ctor_get(v_result_2983_, 0);
lean_inc(v_a_2985_);
lean_dec_ref_known(v_result_2983_, 1);
v___x_2986_ = lean_unsigned_to_nat(1u);
lean_inc_ref(v_value_2553_);
v___x_2987_ = lp_algalVerification_Algal_Expr_asStr(v_value_2553_, v___x_2986_, v_a_2985_);
v_result_2992_ = lean_ctor_get(v___x_2987_, 0);
lean_inc_ref(v_result_2992_);
lean_dec_ref(v___x_2987_);
if (lean_obj_tag(v_result_2992_) == 0)
{
lean_object* v_a_2993_; lean_object* v___x_2995_; uint8_t v_isShared_2996_; uint8_t v_isSharedCheck_3000_; 
lean_dec(v_a_2974_);
lean_del_object(v___x_2584_);
lean_dec_ref(v_value_2553_);
v_a_2993_ = lean_ctor_get(v_result_2992_, 0);
v_isSharedCheck_3000_ = !lean_is_exclusive(v_result_2992_);
if (v_isSharedCheck_3000_ == 0)
{
v___x_2995_ = v_result_2992_;
v_isShared_2996_ = v_isSharedCheck_3000_;
goto v_resetjp_2994_;
}
else
{
lean_inc(v_a_2993_);
lean_dec(v_result_2992_);
v___x_2995_ = lean_box(0);
v_isShared_2996_ = v_isSharedCheck_3000_;
goto v_resetjp_2994_;
}
v_resetjp_2994_:
{
lean_object* v___x_2998_; 
if (v_isShared_2996_ == 0)
{
v___x_2998_ = v___x_2995_;
goto v_reusejp_2997_;
}
else
{
lean_object* v_reuseFailAlloc_2999_; 
v_reuseFailAlloc_2999_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2999_, 0, v_a_2993_);
v___x_2998_ = v_reuseFailAlloc_2999_;
goto v_reusejp_2997_;
}
v_reusejp_2997_:
{
v_result_2979_ = v___x_2998_;
v_charges_2980_ = v___x_2965_;
goto v___jp_2978_;
}
}
}
else
{
lean_object* v_a_3001_; lean_object* v___x_3002_; lean_object* v___x_3003_; lean_object* v_result_3005_; lean_object* v_charges_3006_; lean_object* v_result_3008_; 
v_a_3001_ = lean_ctor_get(v_result_2992_, 0);
lean_inc(v_a_3001_);
lean_dec_ref_known(v_result_2992_, 1);
v___x_3002_ = lp_algalVerification_Algal_Expr_strFold(v_value_2553_, v_a_2974_, v___x_2957_);
v___x_3003_ = lp_algalVerification_Algal_Expr_liftE___redArg(v___x_3002_);
v_result_3008_ = lean_ctor_get(v___x_3003_, 0);
lean_inc_ref(v_result_3008_);
lean_dec_ref(v___x_3003_);
if (lean_obj_tag(v_result_3008_) == 0)
{
lean_object* v_a_3009_; lean_object* v___x_3011_; uint8_t v_isShared_3012_; uint8_t v_isSharedCheck_3016_; 
lean_dec(v_a_3001_);
lean_del_object(v___x_2584_);
v_a_3009_ = lean_ctor_get(v_result_3008_, 0);
v_isSharedCheck_3016_ = !lean_is_exclusive(v_result_3008_);
if (v_isSharedCheck_3016_ == 0)
{
v___x_3011_ = v_result_3008_;
v_isShared_3012_ = v_isSharedCheck_3016_;
goto v_resetjp_3010_;
}
else
{
lean_inc(v_a_3009_);
lean_dec(v_result_3008_);
v___x_3011_ = lean_box(0);
v_isShared_3012_ = v_isSharedCheck_3016_;
goto v_resetjp_3010_;
}
v_resetjp_3010_:
{
lean_object* v___x_3014_; 
if (v_isShared_3012_ == 0)
{
v___x_3014_ = v___x_3011_;
goto v_reusejp_3013_;
}
else
{
lean_object* v_reuseFailAlloc_3015_; 
v_reuseFailAlloc_3015_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3015_, 0, v_a_3009_);
v___x_3014_ = v_reuseFailAlloc_3015_;
goto v_reusejp_3013_;
}
v_reusejp_3013_:
{
v_result_2989_ = v___x_3014_;
v_charges_2990_ = v___x_2965_;
goto v___jp_2988_;
}
}
}
else
{
lean_object* v_a_3017_; lean_object* v___x_3018_; lean_object* v___x_3019_; lean_object* v___x_3020_; lean_object* v___x_3021_; lean_object* v___x_3022_; lean_object* v___x_3023_; lean_object* v___x_3024_; uint8_t v___x_3025_; 
v_a_3017_ = lean_ctor_get(v_result_3008_, 0);
lean_inc(v_a_3017_);
lean_dec_ref_known(v_result_3008_, 1);
v___x_3018_ = lean_string_utf8_byte_size(v_a_3001_);
v___x_3019_ = l_List_lengthTR___redArg(v_a_3017_);
v___x_3020_ = lean_nat_sub(v___x_3019_, v___x_2986_);
lean_dec(v___x_3019_);
v___x_3021_ = lean_nat_mul(v___x_3018_, v___x_3020_);
lean_dec(v___x_3020_);
v___x_3022_ = lp_algalVerification_List_foldl___at___00Algal_Expr_machine_spec__3(v___x_2957_, v_a_3017_);
v___x_3023_ = lean_nat_add(v___x_3021_, v___x_3022_);
lean_dec(v___x_3022_);
lean_dec(v___x_3021_);
v___x_3024_ = lean_unsigned_to_nat(65536u);
v___x_3025_ = lean_nat_dec_lt(v___x_3024_, v___x_3023_);
if (v___x_3025_ == 0)
{
lean_object* v___x_3026_; lean_object* v_result_3027_; lean_object* v_charges_3028_; lean_object* v___x_3030_; uint8_t v_isShared_3031_; uint8_t v_isSharedCheck_3040_; 
v___x_3026_ = lp_algalVerification_Algal_Expr_charge(v___x_3023_);
v_result_3027_ = lean_ctor_get(v___x_3026_, 0);
lean_inc_ref(v_result_3027_);
v_charges_3028_ = lean_ctor_get(v___x_3026_, 1);
lean_inc(v_charges_3028_);
lean_dec_ref(v___x_3026_);
v_isSharedCheck_3040_ = !lean_is_exclusive(v_result_3027_);
if (v_isSharedCheck_3040_ == 0)
{
lean_object* v_unused_3041_; 
v_unused_3041_ = lean_ctor_get(v_result_3027_, 0);
lean_dec(v_unused_3041_);
v___x_3030_ = v_result_3027_;
v_isShared_3031_ = v_isSharedCheck_3040_;
goto v_resetjp_3029_;
}
else
{
lean_dec(v_result_3027_);
v___x_3030_ = lean_box(0);
v_isShared_3031_ = v_isSharedCheck_3040_;
goto v_resetjp_3029_;
}
v_resetjp_3029_:
{
lean_object* v___x_3032_; lean_object* v___x_3034_; 
v___x_3032_ = lp_algalVerification_Algal_Expr_joinStrs(v_a_3001_, v_a_3017_);
lean_dec(v_a_3001_);
if (v_isShared_2585_ == 0)
{
lean_ctor_set(v___x_2584_, 0, v___x_3032_);
v___x_3034_ = v___x_2584_;
goto v_reusejp_3033_;
}
else
{
lean_object* v_reuseFailAlloc_3039_; 
v_reuseFailAlloc_3039_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3039_, 0, v___x_3032_);
v___x_3034_ = v_reuseFailAlloc_3039_;
goto v_reusejp_3033_;
}
v_reusejp_3033_:
{
lean_object* v___x_3036_; 
if (v_isShared_3031_ == 0)
{
lean_ctor_set(v___x_3030_, 0, v___x_3034_);
v___x_3036_ = v___x_3030_;
goto v_reusejp_3035_;
}
else
{
lean_object* v_reuseFailAlloc_3038_; 
v_reuseFailAlloc_3038_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3038_, 0, v___x_3034_);
v___x_3036_ = v_reuseFailAlloc_3038_;
goto v_reusejp_3035_;
}
v_reusejp_3035_:
{
lean_object* v___x_3037_; 
v___x_3037_ = l_List_appendTR___redArg(v_charges_3028_, v___x_2965_);
v_result_3005_ = v___x_3036_;
v_charges_3006_ = v___x_3037_;
goto v___jp_3004_;
}
}
}
}
else
{
lean_object* v___x_3042_; lean_object* v_result_3043_; 
lean_dec(v___x_3023_);
lean_dec(v_a_3017_);
lean_dec(v_a_3001_);
lean_del_object(v___x_2584_);
v___x_3042_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__13___closed__2, &lp_algalVerification_Algal_Expr_machine___lam__13___closed__2_once, _init_lp_algalVerification_Algal_Expr_machine___lam__13___closed__2);
v_result_3043_ = lean_ctor_get(v___x_3042_, 0);
lean_inc_ref(v_result_3043_);
v_result_3005_ = v_result_3043_;
v_charges_3006_ = v___x_2965_;
goto v___jp_3004_;
}
}
v___jp_3004_:
{
lean_object* v___x_3007_; 
v___x_3007_ = l_List_appendTR___redArg(v___x_2965_, v_charges_3006_);
v_result_2989_ = v_result_3005_;
v_charges_2990_ = v___x_3007_;
goto v___jp_2988_;
}
}
v___jp_2988_:
{
lean_object* v___x_2991_; 
v___x_2991_ = l_List_appendTR___redArg(v___x_2965_, v_charges_2990_);
v_result_2979_ = v_result_2989_;
v_charges_2980_ = v___x_2991_;
goto v___jp_2978_;
}
}
v___jp_2978_:
{
lean_object* v_charges_2981_; lean_object* v___x_2982_; 
v_charges_2981_ = lean_ctor_get(v___x_2977_, 1);
lean_inc(v_charges_2981_);
lean_dec_ref(v___x_2977_);
v___x_2982_ = l_List_appendTR___redArg(v_charges_2981_, v_charges_2980_);
v_result_2960_ = v_result_2979_;
v_charges_2961_ = v___x_2982_;
goto v___jp_2959_;
}
}
}
v___jp_2959_:
{
lean_object* v___x_2962_; lean_object* v___x_2963_; 
v___x_2962_ = lean_box(0);
v___x_2963_ = l_List_appendTR___redArg(v___x_2962_, v_charges_2961_);
v_result_2947_ = v_result_2960_;
v_charges_2948_ = v___x_2963_;
goto v___jp_2946_;
}
}
}
v___jp_2946_:
{
lean_object* v_charges_2949_; lean_object* v___x_2950_; 
v_charges_2949_ = lean_ctor_get(v___x_2945_, 1);
lean_inc(v_charges_2949_);
lean_dec_ref(v___x_2945_);
v___x_2950_ = l_List_appendTR___redArg(v_charges_2949_, v_charges_2948_);
v_result_2558_ = v_result_2947_;
v_charges_2559_ = v___x_2950_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_3047_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3047_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3047_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3048_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3048_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3048_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3049_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3049_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3049_;
goto v___jp_2571_;
}
}
}
else
{
if (lean_obj_tag(v_rest_2552_) == 1)
{
lean_object* v_rest_3050_; 
v_rest_3050_ = lean_ctor_get(v_rest_2552_, 1);
if (lean_obj_tag(v_rest_3050_) == 1)
{
lean_object* v_rest_3051_; 
v_rest_3051_ = lean_ctor_get(v_rest_3050_, 1);
if (lean_obj_tag(v_rest_3051_) == 0)
{
lean_object* v_value_3052_; lean_object* v_value_3053_; lean_object* v___x_3055_; 
lean_inc_ref(v_rest_3050_);
lean_dec(v___x_2554_);
v_value_3052_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_3052_);
lean_dec_ref_known(v_rest_2552_, 2);
v_value_3053_ = lean_ctor_get(v_rest_3050_, 0);
lean_inc(v_value_3053_);
lean_dec_ref_known(v_rest_3050_, 2);
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_3052_);
v___x_3055_ = v___x_2519_;
goto v_reusejp_3054_;
}
else
{
lean_object* v_reuseFailAlloc_3152_; 
v_reuseFailAlloc_3152_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3152_, 0, v_value_3052_);
v___x_3055_ = v_reuseFailAlloc_3152_;
goto v_reusejp_3054_;
}
v_reusejp_3054_:
{
lean_object* v___x_3056_; lean_object* v_result_3058_; lean_object* v_charges_3059_; lean_object* v_result_3062_; 
lean_inc(v_scope_2515_);
v___x_3056_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3055_);
v_result_3062_ = lean_ctor_get(v___x_3056_, 0);
lean_inc_ref(v_result_3062_);
if (lean_obj_tag(v_result_3062_) == 0)
{
lean_object* v_charges_3063_; 
lean_dec(v_value_3053_);
lean_del_object(v___x_2584_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_charges_3063_ = lean_ctor_get(v___x_3056_, 1);
lean_inc(v_charges_3063_);
lean_dec_ref(v___x_3056_);
v_result_2558_ = v_result_3062_;
v_charges_2559_ = v_charges_3063_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_3064_; lean_object* v___x_3066_; uint8_t v_isShared_3067_; uint8_t v_isSharedCheck_3151_; 
v_a_3064_ = lean_ctor_get(v_result_3062_, 0);
v_isSharedCheck_3151_ = !lean_is_exclusive(v_result_3062_);
if (v_isSharedCheck_3151_ == 0)
{
v___x_3066_ = v_result_3062_;
v_isShared_3067_ = v_isSharedCheck_3151_;
goto v_resetjp_3065_;
}
else
{
lean_inc(v_a_3064_);
lean_dec(v_result_3062_);
v___x_3066_ = lean_box(0);
v_isShared_3067_ = v_isSharedCheck_3151_;
goto v_resetjp_3065_;
}
v_resetjp_3065_:
{
lean_object* v___x_3068_; lean_object* v___x_3069_; lean_object* v_result_3071_; lean_object* v_charges_3072_; lean_object* v_result_3075_; lean_object* v___x_3076_; 
v___x_3068_ = lean_unsigned_to_nat(0u);
lean_inc_ref(v_value_2553_);
v___x_3069_ = lp_algalVerification_Algal_Expr_asStr(v_value_2553_, v___x_3068_, v_a_3064_);
v_result_3075_ = lean_ctor_get(v___x_3069_, 0);
lean_inc_ref(v_result_3075_);
lean_dec_ref(v___x_3069_);
v___x_3076_ = lean_box(0);
if (lean_obj_tag(v_result_3075_) == 0)
{
lean_object* v_a_3077_; lean_object* v___x_3079_; uint8_t v_isShared_3080_; uint8_t v_isSharedCheck_3084_; 
lean_del_object(v___x_3066_);
lean_dec(v_value_3053_);
lean_del_object(v___x_2584_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_a_3077_ = lean_ctor_get(v_result_3075_, 0);
v_isSharedCheck_3084_ = !lean_is_exclusive(v_result_3075_);
if (v_isSharedCheck_3084_ == 0)
{
v___x_3079_ = v_result_3075_;
v_isShared_3080_ = v_isSharedCheck_3084_;
goto v_resetjp_3078_;
}
else
{
lean_inc(v_a_3077_);
lean_dec(v_result_3075_);
v___x_3079_ = lean_box(0);
v_isShared_3080_ = v_isSharedCheck_3084_;
goto v_resetjp_3078_;
}
v_resetjp_3078_:
{
lean_object* v___x_3082_; 
if (v_isShared_3080_ == 0)
{
v___x_3082_ = v___x_3079_;
goto v_reusejp_3081_;
}
else
{
lean_object* v_reuseFailAlloc_3083_; 
v_reuseFailAlloc_3083_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3083_, 0, v_a_3077_);
v___x_3082_ = v_reuseFailAlloc_3083_;
goto v_reusejp_3081_;
}
v_reusejp_3081_:
{
v_result_3058_ = v___x_3082_;
v_charges_3059_ = v___x_3076_;
goto v___jp_3057_;
}
}
}
else
{
lean_object* v_a_3085_; lean_object* v___x_3087_; 
v_a_3085_ = lean_ctor_get(v_result_3075_, 0);
lean_inc(v_a_3085_);
lean_dec_ref_known(v_result_3075_, 1);
if (v_isShared_3067_ == 0)
{
lean_ctor_set_tag(v___x_3066_, 0);
lean_ctor_set(v___x_3066_, 0, v_value_3053_);
v___x_3087_ = v___x_3066_;
goto v_reusejp_3086_;
}
else
{
lean_object* v_reuseFailAlloc_3150_; 
v_reuseFailAlloc_3150_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3150_, 0, v_value_3053_);
v___x_3087_ = v_reuseFailAlloc_3150_;
goto v_reusejp_3086_;
}
v_reusejp_3086_:
{
lean_object* v___x_3088_; lean_object* v_result_3090_; lean_object* v_charges_3091_; lean_object* v_result_3094_; 
v___x_3088_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3087_);
v_result_3094_ = lean_ctor_get(v___x_3088_, 0);
lean_inc_ref(v_result_3094_);
if (lean_obj_tag(v_result_3094_) == 0)
{
lean_object* v_charges_3095_; 
lean_dec(v_a_3085_);
lean_del_object(v___x_2584_);
lean_dec_ref(v_value_2553_);
v_charges_3095_ = lean_ctor_get(v___x_3088_, 1);
lean_inc(v_charges_3095_);
lean_dec_ref(v___x_3088_);
v_result_3071_ = v_result_3094_;
v_charges_3072_ = v_charges_3095_;
goto v___jp_3070_;
}
else
{
lean_object* v_a_3096_; lean_object* v___x_3097_; lean_object* v___x_3098_; lean_object* v_result_3100_; lean_object* v_charges_3101_; lean_object* v_result_3103_; 
v_a_3096_ = lean_ctor_get(v_result_3094_, 0);
lean_inc(v_a_3096_);
lean_dec_ref_known(v_result_3094_, 1);
v___x_3097_ = lean_unsigned_to_nat(1u);
lean_inc_ref(v_value_2553_);
v___x_3098_ = lp_algalVerification_Algal_Expr_asStr(v_value_2553_, v___x_3097_, v_a_3096_);
v_result_3103_ = lean_ctor_get(v___x_3098_, 0);
lean_inc_ref(v_result_3103_);
lean_dec_ref(v___x_3098_);
if (lean_obj_tag(v_result_3103_) == 0)
{
lean_object* v_a_3104_; lean_object* v___x_3106_; uint8_t v_isShared_3107_; uint8_t v_isSharedCheck_3111_; 
lean_dec(v_a_3085_);
lean_del_object(v___x_2584_);
lean_dec_ref(v_value_2553_);
v_a_3104_ = lean_ctor_get(v_result_3103_, 0);
v_isSharedCheck_3111_ = !lean_is_exclusive(v_result_3103_);
if (v_isSharedCheck_3111_ == 0)
{
v___x_3106_ = v_result_3103_;
v_isShared_3107_ = v_isSharedCheck_3111_;
goto v_resetjp_3105_;
}
else
{
lean_inc(v_a_3104_);
lean_dec(v_result_3103_);
v___x_3106_ = lean_box(0);
v_isShared_3107_ = v_isSharedCheck_3111_;
goto v_resetjp_3105_;
}
v_resetjp_3105_:
{
lean_object* v___x_3109_; 
if (v_isShared_3107_ == 0)
{
v___x_3109_ = v___x_3106_;
goto v_reusejp_3108_;
}
else
{
lean_object* v_reuseFailAlloc_3110_; 
v_reuseFailAlloc_3110_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3110_, 0, v_a_3104_);
v___x_3109_ = v_reuseFailAlloc_3110_;
goto v_reusejp_3108_;
}
v_reusejp_3108_:
{
v_result_3090_ = v___x_3109_;
v_charges_3091_ = v___x_3076_;
goto v___jp_3089_;
}
}
}
else
{
lean_object* v_a_3112_; lean_object* v___x_3113_; uint8_t v___x_3114_; 
v_a_3112_ = lean_ctor_get(v_result_3103_, 0);
lean_inc(v_a_3112_);
lean_dec_ref_known(v_result_3103_, 1);
v___x_3113_ = lean_string_data(v_a_3112_);
v___x_3114_ = l_List_instDecidableEqNil___redArg(v___x_3113_);
if (v___x_3114_ == 0)
{
lean_object* v___x_3115_; lean_object* v___x_3116_; lean_object* v_result_3118_; lean_object* v_charges_3119_; lean_object* v___x_3122_; lean_object* v___x_3123_; lean_object* v___x_3124_; lean_object* v___x_3125_; uint8_t v___x_3126_; 
lean_dec_ref(v_value_2553_);
v___x_3115_ = lean_string_utf8_byte_size(v_a_3085_);
v___x_3116_ = lp_algalVerification_Algal_Expr_charge(v___x_3115_);
v___x_3122_ = lean_string_data(v_a_3085_);
v___x_3123_ = lp_algalVerification_Algal_Expr_splitChars___redArg(v___x_3122_, v___x_3113_);
lean_dec(v___x_3113_);
v___x_3124_ = lean_unsigned_to_nat(1024u);
v___x_3125_ = l_List_lengthTR___redArg(v___x_3123_);
v___x_3126_ = lean_nat_dec_lt(v___x_3124_, v___x_3125_);
if (v___x_3126_ == 0)
{
lean_object* v___x_3127_; lean_object* v_result_3128_; lean_object* v_charges_3129_; lean_object* v___x_3131_; uint8_t v_isShared_3132_; uint8_t v_isSharedCheck_3142_; 
v___x_3127_ = lp_algalVerification_Algal_Expr_charge(v___x_3125_);
v_result_3128_ = lean_ctor_get(v___x_3127_, 0);
lean_inc_ref(v_result_3128_);
v_charges_3129_ = lean_ctor_get(v___x_3127_, 1);
lean_inc(v_charges_3129_);
lean_dec_ref(v___x_3127_);
v_isSharedCheck_3142_ = !lean_is_exclusive(v_result_3128_);
if (v_isSharedCheck_3142_ == 0)
{
lean_object* v_unused_3143_; 
v_unused_3143_ = lean_ctor_get(v_result_3128_, 0);
lean_dec(v_unused_3143_);
v___x_3131_ = v_result_3128_;
v_isShared_3132_ = v_isSharedCheck_3142_;
goto v_resetjp_3130_;
}
else
{
lean_dec(v_result_3128_);
v___x_3131_ = lean_box(0);
v_isShared_3132_ = v_isSharedCheck_3142_;
goto v_resetjp_3130_;
}
v_resetjp_3130_:
{
lean_object* v___x_3133_; lean_object* v___x_3134_; lean_object* v___x_3136_; 
v___x_3133_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_machine_spec__4(v___x_3123_, v___x_3076_);
v___x_3134_ = lp_algalVerification_Algal_Expr_itemsFromList(v___x_3133_);
if (v_isShared_2585_ == 0)
{
lean_ctor_set_tag(v___x_2584_, 4);
lean_ctor_set(v___x_2584_, 0, v___x_3134_);
v___x_3136_ = v___x_2584_;
goto v_reusejp_3135_;
}
else
{
lean_object* v_reuseFailAlloc_3141_; 
v_reuseFailAlloc_3141_ = lean_alloc_ctor(4, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3141_, 0, v___x_3134_);
v___x_3136_ = v_reuseFailAlloc_3141_;
goto v_reusejp_3135_;
}
v_reusejp_3135_:
{
lean_object* v___x_3138_; 
if (v_isShared_3132_ == 0)
{
lean_ctor_set(v___x_3131_, 0, v___x_3136_);
v___x_3138_ = v___x_3131_;
goto v_reusejp_3137_;
}
else
{
lean_object* v_reuseFailAlloc_3140_; 
v_reuseFailAlloc_3140_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3140_, 0, v___x_3136_);
v___x_3138_ = v_reuseFailAlloc_3140_;
goto v_reusejp_3137_;
}
v_reusejp_3137_:
{
lean_object* v___x_3139_; 
v___x_3139_ = l_List_appendTR___redArg(v_charges_3129_, v___x_3076_);
v_result_3118_ = v___x_3138_;
v_charges_3119_ = v___x_3139_;
goto v___jp_3117_;
}
}
}
}
else
{
lean_object* v___x_3144_; lean_object* v_result_3145_; 
lean_dec(v___x_3125_);
lean_dec(v___x_3123_);
lean_del_object(v___x_2584_);
v___x_3144_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___closed__42, &lp_algalVerification_Algal_Expr_machine___closed__42_once, _init_lp_algalVerification_Algal_Expr_machine___closed__42);
v_result_3145_ = lean_ctor_get(v___x_3144_, 0);
lean_inc_ref(v_result_3145_);
v_result_3118_ = v_result_3145_;
v_charges_3119_ = v___x_3076_;
goto v___jp_3117_;
}
v___jp_3117_:
{
lean_object* v_charges_3120_; lean_object* v___x_3121_; 
v_charges_3120_ = lean_ctor_get(v___x_3116_, 1);
lean_inc(v_charges_3120_);
lean_dec_ref(v___x_3116_);
v___x_3121_ = l_List_appendTR___redArg(v_charges_3120_, v_charges_3119_);
v_result_3100_ = v_result_3118_;
v_charges_3101_ = v___x_3121_;
goto v___jp_3099_;
}
}
else
{
lean_object* v___x_3146_; lean_object* v___x_3147_; lean_object* v___x_3148_; lean_object* v_result_3149_; 
lean_dec(v___x_3113_);
lean_dec(v_a_3085_);
lean_del_object(v___x_2584_);
v___x_3146_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__43));
v___x_3147_ = lp_algalVerification_Algal_Expr_errArg(v_value_2553_, v___x_3146_);
v___x_3148_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_3147_);
v_result_3149_ = lean_ctor_get(v___x_3148_, 0);
lean_inc_ref(v_result_3149_);
lean_dec_ref(v___x_3148_);
v_result_3100_ = v_result_3149_;
v_charges_3101_ = v___x_3076_;
goto v___jp_3099_;
}
}
v___jp_3099_:
{
lean_object* v___x_3102_; 
v___x_3102_ = l_List_appendTR___redArg(v___x_3076_, v_charges_3101_);
v_result_3090_ = v_result_3100_;
v_charges_3091_ = v___x_3102_;
goto v___jp_3089_;
}
}
v___jp_3089_:
{
lean_object* v_charges_3092_; lean_object* v___x_3093_; 
v_charges_3092_ = lean_ctor_get(v___x_3088_, 1);
lean_inc(v_charges_3092_);
lean_dec_ref(v___x_3088_);
v___x_3093_ = l_List_appendTR___redArg(v_charges_3092_, v_charges_3091_);
v_result_3071_ = v_result_3090_;
v_charges_3072_ = v___x_3093_;
goto v___jp_3070_;
}
}
}
v___jp_3070_:
{
lean_object* v___x_3073_; lean_object* v___x_3074_; 
v___x_3073_ = lean_box(0);
v___x_3074_ = l_List_appendTR___redArg(v___x_3073_, v_charges_3072_);
v_result_3058_ = v_result_3071_;
v_charges_3059_ = v___x_3074_;
goto v___jp_3057_;
}
}
}
v___jp_3057_:
{
lean_object* v_charges_3060_; lean_object* v___x_3061_; 
v_charges_3060_ = lean_ctor_get(v___x_3056_, 1);
lean_inc(v_charges_3060_);
lean_dec_ref(v___x_3056_);
v___x_3061_ = l_List_appendTR___redArg(v_charges_3060_, v_charges_3059_);
v_result_2558_ = v_result_3058_;
v_charges_2559_ = v___x_3061_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_3153_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3153_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3153_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3154_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3154_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3154_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3155_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3155_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3155_;
goto v___jp_2571_;
}
}
}
else
{
lean_object* v___x_3156_; lean_object* v___x_3157_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
v___x_3156_ = lean_box(0);
v___x_3157_ = lp_algalVerification_Algal_Expr_machine___lam__13(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_3156_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3157_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3158_; lean_object* v___x_3159_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
v___x_3158_ = lean_box(0);
v___x_3159_ = lp_algalVerification_Algal_Expr_machine___lam__13(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_3158_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3159_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3160_; lean_object* v___x_3161_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
v___x_3160_ = lean_box(0);
v___x_3161_ = lp_algalVerification_Algal_Expr_machine___lam__13(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_3160_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3161_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3162_; lean_object* v___x_3163_; lean_object* v___x_3164_; lean_object* v_result_3166_; lean_object* v_charges_3167_; lean_object* v_result_3170_; lean_object* v___x_3171_; 
lean_del_object(v___x_2584_);
lean_dec(v___x_2554_);
lean_del_object(v___x_2519_);
v___x_3162_ = lean_unsigned_to_nat(1u);
v___x_3163_ = lean_box(0);
lean_inc_ref(v_value_2553_);
v___x_3164_ = lp_algalVerification_Algal_Expr_checkArity(v_value_2553_, v_rest_2552_, v___x_3162_, v___x_3163_);
v_result_3170_ = lean_ctor_get(v___x_3164_, 0);
lean_inc_ref(v_result_3170_);
lean_dec_ref(v___x_3164_);
v___x_3171_ = lean_box(0);
if (lean_obj_tag(v_result_3170_) == 0)
{
lean_object* v_a_3172_; lean_object* v___x_3174_; uint8_t v_isShared_3175_; uint8_t v_isSharedCheck_3179_; 
lean_dec_ref(v_value_2553_);
lean_dec(v_rest_2552_);
lean_dec(v_scope_2515_);
v_a_3172_ = lean_ctor_get(v_result_3170_, 0);
v_isSharedCheck_3179_ = !lean_is_exclusive(v_result_3170_);
if (v_isSharedCheck_3179_ == 0)
{
v___x_3174_ = v_result_3170_;
v_isShared_3175_ = v_isSharedCheck_3179_;
goto v_resetjp_3173_;
}
else
{
lean_inc(v_a_3172_);
lean_dec(v_result_3170_);
v___x_3174_ = lean_box(0);
v_isShared_3175_ = v_isSharedCheck_3179_;
goto v_resetjp_3173_;
}
v_resetjp_3173_:
{
lean_object* v___x_3177_; 
if (v_isShared_3175_ == 0)
{
v___x_3177_ = v___x_3174_;
goto v_reusejp_3176_;
}
else
{
lean_object* v_reuseFailAlloc_3178_; 
v_reuseFailAlloc_3178_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3178_, 0, v_a_3172_);
v___x_3177_ = v_reuseFailAlloc_3178_;
goto v_reusejp_3176_;
}
v_reusejp_3176_:
{
v_result_2558_ = v___x_3177_;
v_charges_2559_ = v___x_3171_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_3180_; lean_object* v___x_3181_; lean_object* v___x_3182_; lean_object* v___x_3183_; lean_object* v_result_3185_; lean_object* v_charges_3186_; lean_object* v_result_3189_; 
lean_dec_ref_known(v_result_3170_, 1);
v___x_3180_ = lean_box(0);
v___x_3181_ = lean_unsigned_to_nat(2u);
v___x_3182_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v___x_3182_, 0, v_rest_2552_);
lean_ctor_set(v___x_3182_, 1, v___x_3180_);
lean_ctor_set(v___x_3182_, 2, v___x_3181_);
v___x_3183_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3182_);
v_result_3189_ = lean_ctor_get(v___x_3183_, 0);
lean_inc_ref(v_result_3189_);
if (lean_obj_tag(v_result_3189_) == 0)
{
lean_object* v_charges_3190_; 
lean_dec_ref(v_value_2553_);
v_charges_3190_ = lean_ctor_get(v___x_3183_, 1);
lean_inc(v_charges_3190_);
lean_dec_ref(v___x_3183_);
v_result_3166_ = v_result_3189_;
v_charges_3167_ = v_charges_3190_;
goto v___jp_3165_;
}
else
{
lean_object* v_a_3191_; 
v_a_3191_ = lean_ctor_get(v_result_3189_, 0);
lean_inc(v_a_3191_);
lean_dec_ref_known(v_result_3189_, 1);
if (lean_obj_tag(v_a_3191_) == 4)
{
lean_object* v_values_3192_; lean_object* v___x_3194_; uint8_t v_isShared_3195_; uint8_t v_isSharedCheck_3235_; 
v_values_3192_ = lean_ctor_get(v_a_3191_, 0);
v_isSharedCheck_3235_ = !lean_is_exclusive(v_a_3191_);
if (v_isSharedCheck_3235_ == 0)
{
v___x_3194_ = v_a_3191_;
v_isShared_3195_ = v_isSharedCheck_3235_;
goto v_resetjp_3193_;
}
else
{
lean_inc(v_values_3192_);
lean_dec(v_a_3191_);
v___x_3194_ = lean_box(0);
v_isShared_3195_ = v_isSharedCheck_3235_;
goto v_resetjp_3193_;
}
v_resetjp_3193_:
{
lean_object* v___x_3196_; lean_object* v___x_3197_; lean_object* v___x_3198_; lean_object* v_result_3200_; lean_object* v_charges_3201_; lean_object* v_result_3203_; 
v___x_3196_ = lean_unsigned_to_nat(0u);
v___x_3197_ = lp_algalVerification_Algal_Expr_strFold(v_value_2553_, v_values_3192_, v___x_3196_);
v___x_3198_ = lp_algalVerification_Algal_Expr_liftE___redArg(v___x_3197_);
v_result_3203_ = lean_ctor_get(v___x_3198_, 0);
lean_inc_ref(v_result_3203_);
lean_dec_ref(v___x_3198_);
if (lean_obj_tag(v_result_3203_) == 0)
{
lean_object* v_a_3204_; lean_object* v___x_3206_; uint8_t v_isShared_3207_; uint8_t v_isSharedCheck_3211_; 
lean_del_object(v___x_3194_);
v_a_3204_ = lean_ctor_get(v_result_3203_, 0);
v_isSharedCheck_3211_ = !lean_is_exclusive(v_result_3203_);
if (v_isSharedCheck_3211_ == 0)
{
v___x_3206_ = v_result_3203_;
v_isShared_3207_ = v_isSharedCheck_3211_;
goto v_resetjp_3205_;
}
else
{
lean_inc(v_a_3204_);
lean_dec(v_result_3203_);
v___x_3206_ = lean_box(0);
v_isShared_3207_ = v_isSharedCheck_3211_;
goto v_resetjp_3205_;
}
v_resetjp_3205_:
{
lean_object* v___x_3209_; 
if (v_isShared_3207_ == 0)
{
v___x_3209_ = v___x_3206_;
goto v_reusejp_3208_;
}
else
{
lean_object* v_reuseFailAlloc_3210_; 
v_reuseFailAlloc_3210_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3210_, 0, v_a_3204_);
v___x_3209_ = v_reuseFailAlloc_3210_;
goto v_reusejp_3208_;
}
v_reusejp_3208_:
{
v_result_3185_ = v___x_3209_;
v_charges_3186_ = v___x_3171_;
goto v___jp_3184_;
}
}
}
else
{
lean_object* v_a_3212_; lean_object* v___x_3213_; lean_object* v___x_3214_; uint8_t v___x_3215_; 
v_a_3212_ = lean_ctor_get(v_result_3203_, 0);
lean_inc(v_a_3212_);
lean_dec_ref_known(v_result_3203_, 1);
v___x_3213_ = lp_algalVerification_List_foldl___at___00Algal_Expr_machine_spec__3(v___x_3196_, v_a_3212_);
v___x_3214_ = lean_unsigned_to_nat(65536u);
v___x_3215_ = lean_nat_dec_lt(v___x_3214_, v___x_3213_);
if (v___x_3215_ == 0)
{
lean_object* v___x_3216_; lean_object* v_result_3217_; lean_object* v_charges_3218_; lean_object* v___x_3220_; uint8_t v_isShared_3221_; uint8_t v_isSharedCheck_3231_; 
v___x_3216_ = lp_algalVerification_Algal_Expr_charge(v___x_3213_);
v_result_3217_ = lean_ctor_get(v___x_3216_, 0);
lean_inc_ref(v_result_3217_);
v_charges_3218_ = lean_ctor_get(v___x_3216_, 1);
lean_inc(v_charges_3218_);
lean_dec_ref(v___x_3216_);
v_isSharedCheck_3231_ = !lean_is_exclusive(v_result_3217_);
if (v_isSharedCheck_3231_ == 0)
{
lean_object* v_unused_3232_; 
v_unused_3232_ = lean_ctor_get(v_result_3217_, 0);
lean_dec(v_unused_3232_);
v___x_3220_ = v_result_3217_;
v_isShared_3221_ = v_isSharedCheck_3231_;
goto v_resetjp_3219_;
}
else
{
lean_dec(v_result_3217_);
v___x_3220_ = lean_box(0);
v_isShared_3221_ = v_isSharedCheck_3231_;
goto v_resetjp_3219_;
}
v_resetjp_3219_:
{
lean_object* v___x_3222_; lean_object* v___x_3223_; lean_object* v___x_3225_; 
v___x_3222_ = ((lean_object*)(lp_algalVerification_Algal_Expr_binderName___closed__0));
v___x_3223_ = lp_algalVerification_List_foldl___at___00Algal_Expr_machine_spec__5(v___x_3222_, v_a_3212_);
lean_dec(v_a_3212_);
if (v_isShared_3195_ == 0)
{
lean_ctor_set_tag(v___x_3194_, 3);
lean_ctor_set(v___x_3194_, 0, v___x_3223_);
v___x_3225_ = v___x_3194_;
goto v_reusejp_3224_;
}
else
{
lean_object* v_reuseFailAlloc_3230_; 
v_reuseFailAlloc_3230_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3230_, 0, v___x_3223_);
v___x_3225_ = v_reuseFailAlloc_3230_;
goto v_reusejp_3224_;
}
v_reusejp_3224_:
{
lean_object* v___x_3227_; 
if (v_isShared_3221_ == 0)
{
lean_ctor_set(v___x_3220_, 0, v___x_3225_);
v___x_3227_ = v___x_3220_;
goto v_reusejp_3226_;
}
else
{
lean_object* v_reuseFailAlloc_3229_; 
v_reuseFailAlloc_3229_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3229_, 0, v___x_3225_);
v___x_3227_ = v_reuseFailAlloc_3229_;
goto v_reusejp_3226_;
}
v_reusejp_3226_:
{
lean_object* v___x_3228_; 
v___x_3228_ = l_List_appendTR___redArg(v_charges_3218_, v___x_3171_);
v_result_3200_ = v___x_3227_;
v_charges_3201_ = v___x_3228_;
goto v___jp_3199_;
}
}
}
}
else
{
lean_object* v___x_3233_; lean_object* v_result_3234_; 
lean_dec(v___x_3213_);
lean_dec(v_a_3212_);
lean_del_object(v___x_3194_);
v___x_3233_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__13___closed__2, &lp_algalVerification_Algal_Expr_machine___lam__13___closed__2_once, _init_lp_algalVerification_Algal_Expr_machine___lam__13___closed__2);
v_result_3234_ = lean_ctor_get(v___x_3233_, 0);
lean_inc_ref(v_result_3234_);
v_result_3200_ = v_result_3234_;
v_charges_3201_ = v___x_3171_;
goto v___jp_3199_;
}
}
v___jp_3199_:
{
lean_object* v___x_3202_; 
v___x_3202_ = l_List_appendTR___redArg(v___x_3171_, v_charges_3201_);
v_result_3185_ = v_result_3200_;
v_charges_3186_ = v___x_3202_;
goto v___jp_3184_;
}
}
}
else
{
lean_object* v___x_3236_; lean_object* v_result_3237_; 
lean_dec(v_a_3191_);
lean_dec_ref(v_value_2553_);
v___x_3236_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__6___closed__0, &lp_algalVerification_Algal_Expr_machine___lam__6___closed__0_once, _init_lp_algalVerification_Algal_Expr_machine___lam__6___closed__0);
v_result_3237_ = lean_ctor_get(v___x_3236_, 0);
lean_inc_ref(v_result_3237_);
v_result_3185_ = v_result_3237_;
v_charges_3186_ = v___x_3171_;
goto v___jp_3184_;
}
}
v___jp_3184_:
{
lean_object* v_charges_3187_; lean_object* v___x_3188_; 
v_charges_3187_ = lean_ctor_get(v___x_3183_, 1);
lean_inc(v_charges_3187_);
lean_dec_ref(v___x_3183_);
v___x_3188_ = l_List_appendTR___redArg(v_charges_3187_, v_charges_3186_);
v_result_3166_ = v_result_3185_;
v_charges_3167_ = v___x_3188_;
goto v___jp_3165_;
}
}
v___jp_3165_:
{
lean_object* v___x_3168_; lean_object* v___x_3169_; 
v___x_3168_ = lean_box(0);
v___x_3169_ = l_List_appendTR___redArg(v___x_3168_, v_charges_3167_);
v_result_2558_ = v_result_3166_;
v_charges_2559_ = v___x_3169_;
goto v___jp_2557_;
}
}
}
else
{
lean_del_object(v___x_2584_);
if (lean_obj_tag(v_rest_2552_) == 1)
{
lean_object* v_rest_3238_; 
v_rest_3238_ = lean_ctor_get(v_rest_2552_, 1);
if (lean_obj_tag(v_rest_3238_) == 0)
{
lean_object* v_value_3239_; lean_object* v___x_3241_; 
lean_dec(v___x_2554_);
v_value_3239_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_3239_);
lean_dec_ref_known(v_rest_2552_, 2);
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_3239_);
v___x_3241_ = v___x_2519_;
goto v_reusejp_3240_;
}
else
{
lean_object* v_reuseFailAlloc_3276_; 
v_reuseFailAlloc_3276_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3276_, 0, v_value_3239_);
v___x_3241_ = v_reuseFailAlloc_3276_;
goto v_reusejp_3240_;
}
v_reusejp_3240_:
{
lean_object* v___x_3242_; lean_object* v_result_3244_; lean_object* v_charges_3245_; lean_object* v_result_3248_; 
v___x_3242_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3241_);
v_result_3248_ = lean_ctor_get(v___x_3242_, 0);
lean_inc_ref(v_result_3248_);
if (lean_obj_tag(v_result_3248_) == 0)
{
lean_object* v_charges_3249_; 
lean_dec_ref(v_value_2553_);
v_charges_3249_ = lean_ctor_get(v___x_3242_, 1);
lean_inc(v_charges_3249_);
lean_dec_ref(v___x_3242_);
v_result_2558_ = v_result_3248_;
v_charges_2559_ = v_charges_3249_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_3250_; lean_object* v___x_3251_; lean_object* v___x_3252_; lean_object* v_result_3253_; lean_object* v___x_3254_; 
v_a_3250_ = lean_ctor_get(v_result_3248_, 0);
lean_inc(v_a_3250_);
lean_dec_ref_known(v_result_3248_, 1);
v___x_3251_ = lean_unsigned_to_nat(0u);
v___x_3252_ = lp_algalVerification_Algal_Expr_asStr(v_value_2553_, v___x_3251_, v_a_3250_);
v_result_3253_ = lean_ctor_get(v___x_3252_, 0);
lean_inc_ref(v_result_3253_);
lean_dec_ref(v___x_3252_);
v___x_3254_ = lean_box(0);
if (lean_obj_tag(v_result_3253_) == 0)
{
lean_object* v_a_3255_; lean_object* v___x_3257_; uint8_t v_isShared_3258_; uint8_t v_isSharedCheck_3262_; 
v_a_3255_ = lean_ctor_get(v_result_3253_, 0);
v_isSharedCheck_3262_ = !lean_is_exclusive(v_result_3253_);
if (v_isSharedCheck_3262_ == 0)
{
v___x_3257_ = v_result_3253_;
v_isShared_3258_ = v_isSharedCheck_3262_;
goto v_resetjp_3256_;
}
else
{
lean_inc(v_a_3255_);
lean_dec(v_result_3253_);
v___x_3257_ = lean_box(0);
v_isShared_3258_ = v_isSharedCheck_3262_;
goto v_resetjp_3256_;
}
v_resetjp_3256_:
{
lean_object* v___x_3260_; 
if (v_isShared_3258_ == 0)
{
v___x_3260_ = v___x_3257_;
goto v_reusejp_3259_;
}
else
{
lean_object* v_reuseFailAlloc_3261_; 
v_reuseFailAlloc_3261_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3261_, 0, v_a_3255_);
v___x_3260_ = v_reuseFailAlloc_3261_;
goto v_reusejp_3259_;
}
v_reusejp_3259_:
{
v_result_3244_ = v___x_3260_;
v_charges_3245_ = v___x_3254_;
goto v___jp_3243_;
}
}
}
else
{
lean_object* v_a_3263_; lean_object* v___x_3265_; uint8_t v_isShared_3266_; uint8_t v_isSharedCheck_3275_; 
v_a_3263_ = lean_ctor_get(v_result_3253_, 0);
v_isSharedCheck_3275_ = !lean_is_exclusive(v_result_3253_);
if (v_isSharedCheck_3275_ == 0)
{
v___x_3265_ = v_result_3253_;
v_isShared_3266_ = v_isSharedCheck_3275_;
goto v_resetjp_3264_;
}
else
{
lean_inc(v_a_3263_);
lean_dec(v_result_3253_);
v___x_3265_ = lean_box(0);
v_isShared_3266_ = v_isSharedCheck_3275_;
goto v_resetjp_3264_;
}
v_resetjp_3264_:
{
lean_object* v___x_3267_; lean_object* v___x_3268_; uint64_t v___x_3269_; lean_object* v___x_3270_; lean_object* v___x_3272_; 
v___x_3267_ = lp_algalVerification_Algal_Core_Text_utf16(v_a_3263_);
v___x_3268_ = l_List_lengthTR___redArg(v___x_3267_);
lean_dec(v___x_3267_);
v___x_3269_ = lp_algalVerification_Algal_Expr_numberOfNat(v___x_3268_);
v___x_3270_ = lean_alloc_ctor(2, 0, 8);
lean_ctor_set_uint64(v___x_3270_, 0, v___x_3269_);
if (v_isShared_3266_ == 0)
{
lean_ctor_set(v___x_3265_, 0, v___x_3270_);
v___x_3272_ = v___x_3265_;
goto v_reusejp_3271_;
}
else
{
lean_object* v_reuseFailAlloc_3274_; 
v_reuseFailAlloc_3274_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3274_, 0, v___x_3270_);
v___x_3272_ = v_reuseFailAlloc_3274_;
goto v_reusejp_3271_;
}
v_reusejp_3271_:
{
lean_object* v___x_3273_; 
v___x_3273_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__4___closed__1, &lp_algalVerification_Algal_Expr_machine___lam__4___closed__1_once, _init_lp_algalVerification_Algal_Expr_machine___lam__4___closed__1);
v_result_3244_ = v___x_3272_;
v_charges_3245_ = v___x_3273_;
goto v___jp_3243_;
}
}
}
}
v___jp_3243_:
{
lean_object* v_charges_3246_; lean_object* v___x_3247_; 
v_charges_3246_ = lean_ctor_get(v___x_3242_, 1);
lean_inc(v_charges_3246_);
lean_dec_ref(v___x_3242_);
lean_inc(v_charges_3245_);
v___x_3247_ = l_List_appendTR___redArg(v_charges_3246_, v_charges_3245_);
v_result_2558_ = v_result_3244_;
v_charges_2559_ = v___x_3247_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_3277_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3277_ = lp_algalVerification_Algal_Expr_machine___lam__22(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3277_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3278_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3278_ = lp_algalVerification_Algal_Expr_machine___lam__22(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3278_;
goto v___jp_2571_;
}
}
}
else
{
if (lean_obj_tag(v_rest_2552_) == 1)
{
lean_object* v_rest_3279_; 
v_rest_3279_ = lean_ctor_get(v_rest_2552_, 1);
if (lean_obj_tag(v_rest_3279_) == 0)
{
lean_object* v_value_3280_; lean_object* v___x_3282_; 
lean_inc(v_rest_3279_);
lean_dec(v___x_2554_);
v_value_3280_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_3280_);
lean_dec_ref_known(v_rest_2552_, 2);
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_3280_);
v___x_3282_ = v___x_2519_;
goto v_reusejp_3281_;
}
else
{
lean_object* v_reuseFailAlloc_3315_; 
v_reuseFailAlloc_3315_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3315_, 0, v_value_3280_);
v___x_3282_ = v_reuseFailAlloc_3315_;
goto v_reusejp_3281_;
}
v_reusejp_3281_:
{
lean_object* v___x_3283_; lean_object* v_result_3285_; lean_object* v_charges_3286_; lean_object* v_result_3289_; 
v___x_3283_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3282_);
v_result_3289_ = lean_ctor_get(v___x_3283_, 0);
lean_inc_ref(v_result_3289_);
if (lean_obj_tag(v_result_3289_) == 0)
{
lean_object* v_charges_3290_; 
lean_del_object(v___x_2584_);
lean_dec_ref(v_value_2553_);
v_charges_3290_ = lean_ctor_get(v___x_3283_, 1);
lean_inc(v_charges_3290_);
lean_dec_ref(v___x_3283_);
v_result_2558_ = v_result_3289_;
v_charges_2559_ = v_charges_3290_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_3291_; lean_object* v___x_3292_; lean_object* v___x_3293_; lean_object* v_result_3294_; lean_object* v___x_3295_; 
v_a_3291_ = lean_ctor_get(v_result_3289_, 0);
lean_inc(v_a_3291_);
lean_dec_ref_known(v_result_3289_, 1);
v___x_3292_ = lean_unsigned_to_nat(0u);
v___x_3293_ = lp_algalVerification_Algal_Expr_asList(v_value_2553_, v___x_3292_, v_a_3291_);
v_result_3294_ = lean_ctor_get(v___x_3293_, 0);
lean_inc_ref(v_result_3294_);
lean_dec_ref(v___x_3293_);
v___x_3295_ = lean_box(0);
if (lean_obj_tag(v_result_3294_) == 0)
{
lean_object* v_a_3296_; lean_object* v___x_3298_; uint8_t v_isShared_3299_; uint8_t v_isSharedCheck_3303_; 
lean_del_object(v___x_2584_);
v_a_3296_ = lean_ctor_get(v_result_3294_, 0);
v_isSharedCheck_3303_ = !lean_is_exclusive(v_result_3294_);
if (v_isSharedCheck_3303_ == 0)
{
v___x_3298_ = v_result_3294_;
v_isShared_3299_ = v_isSharedCheck_3303_;
goto v_resetjp_3297_;
}
else
{
lean_inc(v_a_3296_);
lean_dec(v_result_3294_);
v___x_3298_ = lean_box(0);
v_isShared_3299_ = v_isSharedCheck_3303_;
goto v_resetjp_3297_;
}
v_resetjp_3297_:
{
lean_object* v___x_3301_; 
if (v_isShared_3299_ == 0)
{
v___x_3301_ = v___x_3298_;
goto v_reusejp_3300_;
}
else
{
lean_object* v_reuseFailAlloc_3302_; 
v_reuseFailAlloc_3302_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3302_, 0, v_a_3296_);
v___x_3301_ = v_reuseFailAlloc_3302_;
goto v_reusejp_3300_;
}
v_reusejp_3300_:
{
v_result_3285_ = v___x_3301_;
v_charges_3286_ = v___x_3295_;
goto v___jp_3284_;
}
}
}
else
{
lean_object* v_a_3304_; lean_object* v___x_3305_; lean_object* v_fst_3306_; lean_object* v_snd_3307_; lean_object* v___x_3309_; 
v_a_3304_ = lean_ctor_get(v_result_3294_, 0);
lean_inc(v_a_3304_);
lean_dec_ref_known(v_result_3294_, 1);
v___x_3305_ = lp_algalVerification_Algal_Expr_uniqueLoop(v_a_3304_, v_rest_3279_);
v_fst_3306_ = lean_ctor_get(v___x_3305_, 0);
lean_inc(v_fst_3306_);
v_snd_3307_ = lean_ctor_get(v___x_3305_, 1);
lean_inc(v_snd_3307_);
lean_dec_ref(v___x_3305_);
if (v_isShared_2585_ == 0)
{
lean_ctor_set_tag(v___x_2584_, 4);
lean_ctor_set(v___x_2584_, 0, v_fst_3306_);
v___x_3309_ = v___x_2584_;
goto v_reusejp_3308_;
}
else
{
lean_object* v_reuseFailAlloc_3314_; 
v_reuseFailAlloc_3314_ = lean_alloc_ctor(4, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3314_, 0, v_fst_3306_);
v___x_3309_ = v_reuseFailAlloc_3314_;
goto v_reusejp_3308_;
}
v_reusejp_3308_:
{
lean_object* v___x_3310_; lean_object* v_result_3311_; lean_object* v_charges_3312_; lean_object* v___x_3313_; 
v___x_3310_ = lp_algalVerification_Algal_Expr_charged___redArg(v___x_3309_, v_snd_3307_);
v_result_3311_ = lean_ctor_get(v___x_3310_, 0);
lean_inc_ref(v_result_3311_);
v_charges_3312_ = lean_ctor_get(v___x_3310_, 1);
lean_inc(v_charges_3312_);
lean_dec_ref(v___x_3310_);
v___x_3313_ = l_List_appendTR___redArg(v___x_3295_, v_charges_3312_);
v_result_3285_ = v_result_3311_;
v_charges_3286_ = v___x_3313_;
goto v___jp_3284_;
}
}
}
v___jp_3284_:
{
lean_object* v_charges_3287_; lean_object* v___x_3288_; 
v_charges_3287_ = lean_ctor_get(v___x_3283_, 1);
lean_inc(v_charges_3287_);
lean_dec_ref(v___x_3283_);
v___x_3288_ = l_List_appendTR___redArg(v_charges_3287_, v_charges_3286_);
v_result_2558_ = v_result_3285_;
v_charges_2559_ = v___x_3288_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_3316_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3316_ = lp_algalVerification_Algal_Expr_machine___lam__22(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3316_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3317_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3317_ = lp_algalVerification_Algal_Expr_machine___lam__22(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3317_;
goto v___jp_2571_;
}
}
}
else
{
if (lean_obj_tag(v_rest_2552_) == 1)
{
lean_object* v_rest_3318_; 
v_rest_3318_ = lean_ctor_get(v_rest_2552_, 1);
if (lean_obj_tag(v_rest_3318_) == 0)
{
lean_object* v_value_3319_; lean_object* v___x_3321_; 
lean_inc(v_rest_3318_);
lean_dec(v___x_2554_);
v_value_3319_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_3319_);
lean_dec_ref_known(v_rest_2552_, 2);
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_3319_);
v___x_3321_ = v___x_2519_;
goto v_reusejp_3320_;
}
else
{
lean_object* v_reuseFailAlloc_3388_; 
v_reuseFailAlloc_3388_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3388_, 0, v_value_3319_);
v___x_3321_ = v_reuseFailAlloc_3388_;
goto v_reusejp_3320_;
}
v_reusejp_3320_:
{
lean_object* v___x_3322_; lean_object* v_result_3324_; lean_object* v_charges_3325_; lean_object* v_result_3328_; 
v___x_3322_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3321_);
v_result_3328_ = lean_ctor_get(v___x_3322_, 0);
lean_inc_ref(v_result_3328_);
if (lean_obj_tag(v_result_3328_) == 0)
{
lean_object* v_charges_3329_; 
lean_del_object(v___x_2584_);
lean_dec_ref(v_value_2553_);
v_charges_3329_ = lean_ctor_get(v___x_3322_, 1);
lean_inc(v_charges_3329_);
lean_dec_ref(v___x_3322_);
v_result_2558_ = v_result_3328_;
v_charges_2559_ = v_charges_3329_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_3330_; lean_object* v___x_3331_; lean_object* v___x_3332_; lean_object* v_result_3334_; lean_object* v_charges_3335_; lean_object* v_result_3338_; lean_object* v___x_3339_; 
v_a_3330_ = lean_ctor_get(v_result_3328_, 0);
lean_inc(v_a_3330_);
lean_dec_ref_known(v_result_3328_, 1);
v___x_3331_ = lean_unsigned_to_nat(0u);
lean_inc_ref(v_value_2553_);
v___x_3332_ = lp_algalVerification_Algal_Expr_asList(v_value_2553_, v___x_3331_, v_a_3330_);
v_result_3338_ = lean_ctor_get(v___x_3332_, 0);
lean_inc_ref(v_result_3338_);
lean_dec_ref(v___x_3332_);
v___x_3339_ = lean_box(0);
if (lean_obj_tag(v_result_3338_) == 0)
{
lean_object* v_a_3340_; lean_object* v___x_3342_; uint8_t v_isShared_3343_; uint8_t v_isSharedCheck_3347_; 
lean_del_object(v___x_2584_);
lean_dec_ref(v_value_2553_);
v_a_3340_ = lean_ctor_get(v_result_3338_, 0);
v_isSharedCheck_3347_ = !lean_is_exclusive(v_result_3338_);
if (v_isSharedCheck_3347_ == 0)
{
v___x_3342_ = v_result_3338_;
v_isShared_3343_ = v_isSharedCheck_3347_;
goto v_resetjp_3341_;
}
else
{
lean_inc(v_a_3340_);
lean_dec(v_result_3338_);
v___x_3342_ = lean_box(0);
v_isShared_3343_ = v_isSharedCheck_3347_;
goto v_resetjp_3341_;
}
v_resetjp_3341_:
{
lean_object* v___x_3345_; 
if (v_isShared_3343_ == 0)
{
v___x_3345_ = v___x_3342_;
goto v_reusejp_3344_;
}
else
{
lean_object* v_reuseFailAlloc_3346_; 
v_reuseFailAlloc_3346_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3346_, 0, v_a_3340_);
v___x_3345_ = v_reuseFailAlloc_3346_;
goto v_reusejp_3344_;
}
v_reusejp_3344_:
{
v_result_3324_ = v___x_3345_;
v_charges_3325_ = v___x_3339_;
goto v___jp_3323_;
}
}
}
else
{
lean_object* v_a_3348_; lean_object* v___x_3349_; lean_object* v___x_3350_; lean_object* v_result_3352_; lean_object* v_charges_3353_; lean_object* v_result_3355_; 
v_a_3348_ = lean_ctor_get(v_result_3338_, 0);
lean_inc(v_a_3348_);
lean_dec_ref_known(v_result_3338_, 1);
v___x_3349_ = lp_algalVerification_Algal_Expr_listCount(v_value_2553_, v_a_3348_, v___x_3331_, v___x_3331_);
v___x_3350_ = lp_algalVerification_Algal_Expr_liftE___redArg(v___x_3349_);
v_result_3355_ = lean_ctor_get(v___x_3350_, 0);
lean_inc_ref(v_result_3355_);
lean_dec_ref(v___x_3350_);
if (lean_obj_tag(v_result_3355_) == 0)
{
lean_object* v_a_3356_; lean_object* v___x_3358_; uint8_t v_isShared_3359_; uint8_t v_isSharedCheck_3363_; 
lean_dec(v_a_3348_);
lean_del_object(v___x_2584_);
v_a_3356_ = lean_ctor_get(v_result_3355_, 0);
v_isSharedCheck_3363_ = !lean_is_exclusive(v_result_3355_);
if (v_isSharedCheck_3363_ == 0)
{
v___x_3358_ = v_result_3355_;
v_isShared_3359_ = v_isSharedCheck_3363_;
goto v_resetjp_3357_;
}
else
{
lean_inc(v_a_3356_);
lean_dec(v_result_3355_);
v___x_3358_ = lean_box(0);
v_isShared_3359_ = v_isSharedCheck_3363_;
goto v_resetjp_3357_;
}
v_resetjp_3357_:
{
lean_object* v___x_3361_; 
if (v_isShared_3359_ == 0)
{
v___x_3361_ = v___x_3358_;
goto v_reusejp_3360_;
}
else
{
lean_object* v_reuseFailAlloc_3362_; 
v_reuseFailAlloc_3362_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3362_, 0, v_a_3356_);
v___x_3361_ = v_reuseFailAlloc_3362_;
goto v_reusejp_3360_;
}
v_reusejp_3360_:
{
v_result_3334_ = v___x_3361_;
v_charges_3335_ = v___x_3339_;
goto v___jp_3333_;
}
}
}
else
{
lean_object* v_a_3364_; lean_object* v___x_3365_; lean_object* v_result_3367_; lean_object* v_charges_3368_; lean_object* v_result_3371_; lean_object* v___x_3373_; uint8_t v_isShared_3374_; uint8_t v_isSharedCheck_3386_; 
v_a_3364_ = lean_ctor_get(v_result_3355_, 0);
lean_inc_n(v_a_3364_, 2);
lean_dec_ref_known(v_result_3355_, 1);
v___x_3365_ = lp_algalVerification_Algal_Expr_charge(v_a_3364_);
v_result_3371_ = lean_ctor_get(v___x_3365_, 0);
lean_inc_ref(v_result_3371_);
v_isSharedCheck_3386_ = !lean_is_exclusive(v_result_3371_);
if (v_isSharedCheck_3386_ == 0)
{
lean_object* v_unused_3387_; 
v_unused_3387_ = lean_ctor_get(v_result_3371_, 0);
lean_dec(v_unused_3387_);
v___x_3373_ = v_result_3371_;
v_isShared_3374_ = v_isSharedCheck_3386_;
goto v_resetjp_3372_;
}
else
{
lean_dec(v_result_3371_);
v___x_3373_ = lean_box(0);
v_isShared_3374_ = v_isSharedCheck_3386_;
goto v_resetjp_3372_;
}
v___jp_3366_:
{
lean_object* v_charges_3369_; lean_object* v___x_3370_; 
v_charges_3369_ = lean_ctor_get(v___x_3365_, 1);
lean_inc(v_charges_3369_);
lean_dec_ref(v___x_3365_);
v___x_3370_ = l_List_appendTR___redArg(v_charges_3369_, v_charges_3368_);
v_result_3352_ = v_result_3367_;
v_charges_3353_ = v___x_3370_;
goto v___jp_3351_;
}
v_resetjp_3372_:
{
lean_object* v___x_3375_; uint8_t v___x_3376_; 
v___x_3375_ = lean_unsigned_to_nat(1024u);
v___x_3376_ = lean_nat_dec_lt(v___x_3375_, v_a_3364_);
lean_dec(v_a_3364_);
if (v___x_3376_ == 0)
{
lean_object* v___x_3377_; lean_object* v___x_3379_; 
v___x_3377_ = lp_algalVerification_Algal_Expr_listsOnto(v_rest_3318_, v_a_3348_);
lean_dec(v_a_3348_);
if (v_isShared_2585_ == 0)
{
lean_ctor_set_tag(v___x_2584_, 4);
lean_ctor_set(v___x_2584_, 0, v___x_3377_);
v___x_3379_ = v___x_2584_;
goto v_reusejp_3378_;
}
else
{
lean_object* v_reuseFailAlloc_3383_; 
v_reuseFailAlloc_3383_ = lean_alloc_ctor(4, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3383_, 0, v___x_3377_);
v___x_3379_ = v_reuseFailAlloc_3383_;
goto v_reusejp_3378_;
}
v_reusejp_3378_:
{
lean_object* v___x_3381_; 
if (v_isShared_3374_ == 0)
{
lean_ctor_set(v___x_3373_, 0, v___x_3379_);
v___x_3381_ = v___x_3373_;
goto v_reusejp_3380_;
}
else
{
lean_object* v_reuseFailAlloc_3382_; 
v_reuseFailAlloc_3382_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3382_, 0, v___x_3379_);
v___x_3381_ = v_reuseFailAlloc_3382_;
goto v_reusejp_3380_;
}
v_reusejp_3380_:
{
v_result_3367_ = v___x_3381_;
v_charges_3368_ = v___x_3339_;
goto v___jp_3366_;
}
}
}
else
{
lean_object* v___x_3384_; lean_object* v_result_3385_; 
lean_del_object(v___x_3373_);
lean_dec(v_a_3348_);
lean_del_object(v___x_2584_);
v___x_3384_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___closed__42, &lp_algalVerification_Algal_Expr_machine___closed__42_once, _init_lp_algalVerification_Algal_Expr_machine___closed__42);
v_result_3385_ = lean_ctor_get(v___x_3384_, 0);
lean_inc_ref(v_result_3385_);
v_result_3367_ = v_result_3385_;
v_charges_3368_ = v___x_3339_;
goto v___jp_3366_;
}
}
}
v___jp_3351_:
{
lean_object* v___x_3354_; 
v___x_3354_ = l_List_appendTR___redArg(v___x_3339_, v_charges_3353_);
v_result_3334_ = v_result_3352_;
v_charges_3335_ = v___x_3354_;
goto v___jp_3333_;
}
}
v___jp_3333_:
{
lean_object* v___x_3336_; lean_object* v___x_3337_; 
v___x_3336_ = lean_box(0);
v___x_3337_ = l_List_appendTR___redArg(v___x_3336_, v_charges_3335_);
v_result_3324_ = v_result_3334_;
v_charges_3325_ = v___x_3337_;
goto v___jp_3323_;
}
}
v___jp_3323_:
{
lean_object* v_charges_3326_; lean_object* v___x_3327_; 
v_charges_3326_ = lean_ctor_get(v___x_3322_, 1);
lean_inc(v_charges_3326_);
lean_dec_ref(v___x_3322_);
v___x_3327_ = l_List_appendTR___redArg(v_charges_3326_, v_charges_3325_);
v_result_2558_ = v_result_3324_;
v_charges_2559_ = v___x_3327_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_3389_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3389_ = lp_algalVerification_Algal_Expr_machine___lam__22(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3389_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3390_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3390_ = lp_algalVerification_Algal_Expr_machine___lam__22(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3390_;
goto v___jp_2571_;
}
}
}
else
{
lean_object* v___x_3391_; lean_object* v___x_3392_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
v___x_3391_ = lean_box(0);
v___x_3392_ = lp_algalVerification_Algal_Expr_machine___lam__12(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_3391_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3392_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3393_; lean_object* v___x_3394_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
v___x_3393_ = lean_box(0);
v___x_3394_ = lp_algalVerification_Algal_Expr_machine___lam__12(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_3393_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3394_;
goto v___jp_2571_;
}
}
else
{
if (lean_obj_tag(v_rest_2552_) == 1)
{
lean_object* v_rest_3395_; 
v_rest_3395_ = lean_ctor_get(v_rest_2552_, 1);
if (lean_obj_tag(v_rest_3395_) == 0)
{
lean_object* v_value_3396_; lean_object* v___x_3398_; 
lean_dec(v___x_2554_);
v_value_3396_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_3396_);
lean_dec_ref_known(v_rest_2552_, 2);
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_3396_);
v___x_3398_ = v___x_2519_;
goto v_reusejp_3397_;
}
else
{
lean_object* v_reuseFailAlloc_3433_; 
v_reuseFailAlloc_3433_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3433_, 0, v_value_3396_);
v___x_3398_ = v_reuseFailAlloc_3433_;
goto v_reusejp_3397_;
}
v_reusejp_3397_:
{
lean_object* v___x_3399_; lean_object* v_result_3401_; lean_object* v_charges_3402_; lean_object* v_result_3405_; 
v___x_3399_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3398_);
v_result_3405_ = lean_ctor_get(v___x_3399_, 0);
lean_inc_ref(v_result_3405_);
if (lean_obj_tag(v_result_3405_) == 0)
{
lean_object* v_charges_3406_; 
lean_del_object(v___x_2584_);
lean_dec_ref(v_value_2553_);
v_charges_3406_ = lean_ctor_get(v___x_3399_, 1);
lean_inc(v_charges_3406_);
lean_dec_ref(v___x_3399_);
v_result_2558_ = v_result_3405_;
v_charges_2559_ = v_charges_3406_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_3407_; lean_object* v___x_3408_; lean_object* v___x_3409_; lean_object* v_result_3410_; lean_object* v___x_3411_; 
v_a_3407_ = lean_ctor_get(v_result_3405_, 0);
lean_inc(v_a_3407_);
lean_dec_ref_known(v_result_3405_, 1);
v___x_3408_ = lean_unsigned_to_nat(0u);
v___x_3409_ = lp_algalVerification_Algal_Expr_asList(v_value_2553_, v___x_3408_, v_a_3407_);
v_result_3410_ = lean_ctor_get(v___x_3409_, 0);
lean_inc_ref(v_result_3410_);
lean_dec_ref(v___x_3409_);
v___x_3411_ = lean_box(0);
if (lean_obj_tag(v_result_3410_) == 0)
{
lean_object* v_a_3412_; lean_object* v___x_3414_; uint8_t v_isShared_3415_; uint8_t v_isSharedCheck_3419_; 
lean_del_object(v___x_2584_);
v_a_3412_ = lean_ctor_get(v_result_3410_, 0);
v_isSharedCheck_3419_ = !lean_is_exclusive(v_result_3410_);
if (v_isSharedCheck_3419_ == 0)
{
v___x_3414_ = v_result_3410_;
v_isShared_3415_ = v_isSharedCheck_3419_;
goto v_resetjp_3413_;
}
else
{
lean_inc(v_a_3412_);
lean_dec(v_result_3410_);
v___x_3414_ = lean_box(0);
v_isShared_3415_ = v_isSharedCheck_3419_;
goto v_resetjp_3413_;
}
v_resetjp_3413_:
{
lean_object* v___x_3417_; 
if (v_isShared_3415_ == 0)
{
v___x_3417_ = v___x_3414_;
goto v_reusejp_3416_;
}
else
{
lean_object* v_reuseFailAlloc_3418_; 
v_reuseFailAlloc_3418_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3418_, 0, v_a_3412_);
v___x_3417_ = v_reuseFailAlloc_3418_;
goto v_reusejp_3416_;
}
v_reusejp_3416_:
{
v_result_3401_ = v___x_3417_;
v_charges_3402_ = v___x_3411_;
goto v___jp_3400_;
}
}
}
else
{
lean_object* v_a_3420_; lean_object* v___x_3422_; uint8_t v_isShared_3423_; uint8_t v_isSharedCheck_3432_; 
v_a_3420_ = lean_ctor_get(v_result_3410_, 0);
v_isSharedCheck_3432_ = !lean_is_exclusive(v_result_3410_);
if (v_isSharedCheck_3432_ == 0)
{
v___x_3422_ = v_result_3410_;
v_isShared_3423_ = v_isSharedCheck_3432_;
goto v_resetjp_3421_;
}
else
{
lean_inc(v_a_3420_);
lean_dec(v_result_3410_);
v___x_3422_ = lean_box(0);
v_isShared_3423_ = v_isSharedCheck_3432_;
goto v_resetjp_3421_;
}
v_resetjp_3421_:
{
lean_object* v___x_3424_; lean_object* v___x_3426_; 
v___x_3424_ = lp_algalVerification_Algal_Expr_itemsReverse(v_a_3420_);
if (v_isShared_2585_ == 0)
{
lean_ctor_set_tag(v___x_2584_, 4);
lean_ctor_set(v___x_2584_, 0, v___x_3424_);
v___x_3426_ = v___x_2584_;
goto v_reusejp_3425_;
}
else
{
lean_object* v_reuseFailAlloc_3431_; 
v_reuseFailAlloc_3431_ = lean_alloc_ctor(4, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3431_, 0, v___x_3424_);
v___x_3426_ = v_reuseFailAlloc_3431_;
goto v_reusejp_3425_;
}
v_reusejp_3425_:
{
lean_object* v___x_3428_; 
if (v_isShared_3423_ == 0)
{
lean_ctor_set(v___x_3422_, 0, v___x_3426_);
v___x_3428_ = v___x_3422_;
goto v_reusejp_3427_;
}
else
{
lean_object* v_reuseFailAlloc_3430_; 
v_reuseFailAlloc_3430_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3430_, 0, v___x_3426_);
v___x_3428_ = v_reuseFailAlloc_3430_;
goto v_reusejp_3427_;
}
v_reusejp_3427_:
{
lean_object* v___x_3429_; 
v___x_3429_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__4___closed__1, &lp_algalVerification_Algal_Expr_machine___lam__4___closed__1_once, _init_lp_algalVerification_Algal_Expr_machine___lam__4___closed__1);
v_result_3401_ = v___x_3428_;
v_charges_3402_ = v___x_3429_;
goto v___jp_3400_;
}
}
}
}
}
v___jp_3400_:
{
lean_object* v_charges_3403_; lean_object* v___x_3404_; 
v_charges_3403_ = lean_ctor_get(v___x_3399_, 1);
lean_inc(v_charges_3403_);
lean_dec_ref(v___x_3399_);
lean_inc(v_charges_3402_);
v___x_3404_ = l_List_appendTR___redArg(v_charges_3403_, v_charges_3402_);
v_result_2558_ = v_result_3401_;
v_charges_2559_ = v___x_3404_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_3434_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3434_ = lp_algalVerification_Algal_Expr_machine___lam__22(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3434_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3435_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3435_ = lp_algalVerification_Algal_Expr_machine___lam__22(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3435_;
goto v___jp_2571_;
}
}
}
else
{
lean_del_object(v___x_2584_);
if (lean_obj_tag(v_rest_2552_) == 1)
{
lean_object* v_rest_3436_; 
v_rest_3436_ = lean_ctor_get(v_rest_2552_, 1);
if (lean_obj_tag(v_rest_3436_) == 1)
{
lean_object* v_rest_3437_; 
v_rest_3437_ = lean_ctor_get(v_rest_3436_, 1);
if (lean_obj_tag(v_rest_3437_) == 0)
{
lean_object* v_value_3438_; lean_object* v_value_3439_; lean_object* v___x_3441_; 
lean_inc_ref(v_rest_3436_);
lean_dec(v___x_2554_);
v_value_3438_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_3438_);
lean_dec_ref_known(v_rest_2552_, 2);
v_value_3439_ = lean_ctor_get(v_rest_3436_, 0);
lean_inc(v_value_3439_);
lean_dec_ref_known(v_rest_3436_, 2);
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_3438_);
v___x_3441_ = v___x_2519_;
goto v_reusejp_3440_;
}
else
{
lean_object* v_reuseFailAlloc_3490_; 
v_reuseFailAlloc_3490_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3490_, 0, v_value_3438_);
v___x_3441_ = v_reuseFailAlloc_3490_;
goto v_reusejp_3440_;
}
v_reusejp_3440_:
{
lean_object* v___x_3442_; lean_object* v_result_3444_; lean_object* v_charges_3445_; lean_object* v_result_3448_; 
lean_inc(v_scope_2515_);
v___x_3442_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3441_);
v_result_3448_ = lean_ctor_get(v___x_3442_, 0);
lean_inc_ref(v_result_3448_);
if (lean_obj_tag(v_result_3448_) == 0)
{
lean_object* v_charges_3449_; 
lean_dec(v_value_3439_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_charges_3449_ = lean_ctor_get(v___x_3442_, 1);
lean_inc(v_charges_3449_);
lean_dec_ref(v___x_3442_);
v_result_2558_ = v_result_3448_;
v_charges_2559_ = v_charges_3449_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_3450_; lean_object* v___x_3452_; uint8_t v_isShared_3453_; uint8_t v_isSharedCheck_3489_; 
v_a_3450_ = lean_ctor_get(v_result_3448_, 0);
v_isSharedCheck_3489_ = !lean_is_exclusive(v_result_3448_);
if (v_isSharedCheck_3489_ == 0)
{
v___x_3452_ = v_result_3448_;
v_isShared_3453_ = v_isSharedCheck_3489_;
goto v_resetjp_3451_;
}
else
{
lean_inc(v_a_3450_);
lean_dec(v_result_3448_);
v___x_3452_ = lean_box(0);
v_isShared_3453_ = v_isSharedCheck_3489_;
goto v_resetjp_3451_;
}
v_resetjp_3451_:
{
lean_object* v___x_3454_; lean_object* v___x_3455_; lean_object* v_result_3457_; lean_object* v_charges_3458_; lean_object* v_result_3461_; lean_object* v___x_3462_; 
v___x_3454_ = lean_unsigned_to_nat(0u);
v___x_3455_ = lp_algalVerification_Algal_Expr_asList(v_value_2553_, v___x_3454_, v_a_3450_);
v_result_3461_ = lean_ctor_get(v___x_3455_, 0);
lean_inc_ref(v_result_3461_);
lean_dec_ref(v___x_3455_);
v___x_3462_ = lean_box(0);
if (lean_obj_tag(v_result_3461_) == 0)
{
lean_object* v_a_3463_; lean_object* v___x_3465_; uint8_t v_isShared_3466_; uint8_t v_isSharedCheck_3470_; 
lean_del_object(v___x_3452_);
lean_dec(v_value_3439_);
lean_dec(v_scope_2515_);
v_a_3463_ = lean_ctor_get(v_result_3461_, 0);
v_isSharedCheck_3470_ = !lean_is_exclusive(v_result_3461_);
if (v_isSharedCheck_3470_ == 0)
{
v___x_3465_ = v_result_3461_;
v_isShared_3466_ = v_isSharedCheck_3470_;
goto v_resetjp_3464_;
}
else
{
lean_inc(v_a_3463_);
lean_dec(v_result_3461_);
v___x_3465_ = lean_box(0);
v_isShared_3466_ = v_isSharedCheck_3470_;
goto v_resetjp_3464_;
}
v_resetjp_3464_:
{
lean_object* v___x_3468_; 
if (v_isShared_3466_ == 0)
{
v___x_3468_ = v___x_3465_;
goto v_reusejp_3467_;
}
else
{
lean_object* v_reuseFailAlloc_3469_; 
v_reuseFailAlloc_3469_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3469_, 0, v_a_3463_);
v___x_3468_ = v_reuseFailAlloc_3469_;
goto v_reusejp_3467_;
}
v_reusejp_3467_:
{
v_result_3444_ = v___x_3468_;
v_charges_3445_ = v___x_3462_;
goto v___jp_3443_;
}
}
}
else
{
lean_object* v_a_3471_; lean_object* v___x_3473_; 
v_a_3471_ = lean_ctor_get(v_result_3461_, 0);
lean_inc(v_a_3471_);
lean_dec_ref_known(v_result_3461_, 1);
if (v_isShared_3453_ == 0)
{
lean_ctor_set_tag(v___x_3452_, 0);
lean_ctor_set(v___x_3452_, 0, v_value_3439_);
v___x_3473_ = v___x_3452_;
goto v_reusejp_3472_;
}
else
{
lean_object* v_reuseFailAlloc_3488_; 
v_reuseFailAlloc_3488_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3488_, 0, v_value_3439_);
v___x_3473_ = v_reuseFailAlloc_3488_;
goto v_reusejp_3472_;
}
v_reusejp_3472_:
{
lean_object* v___x_3474_; lean_object* v_result_3475_; 
v___x_3474_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3473_);
v_result_3475_ = lean_ctor_get(v___x_3474_, 0);
lean_inc_ref(v_result_3475_);
if (lean_obj_tag(v_result_3475_) == 0)
{
lean_object* v_charges_3476_; 
lean_dec(v_a_3471_);
v_charges_3476_ = lean_ctor_get(v___x_3474_, 1);
lean_inc(v_charges_3476_);
lean_dec_ref(v___x_3474_);
v_result_3457_ = v_result_3475_;
v_charges_3458_ = v_charges_3476_;
goto v___jp_3456_;
}
else
{
lean_object* v_charges_3477_; lean_object* v_a_3478_; lean_object* v___x_3479_; lean_object* v_fst_3480_; lean_object* v_snd_3481_; lean_object* v___x_3482_; uint8_t v___x_3483_; lean_object* v___x_3484_; lean_object* v_result_3485_; lean_object* v_charges_3486_; lean_object* v___x_3487_; 
v_charges_3477_ = lean_ctor_get(v___x_3474_, 1);
lean_inc(v_charges_3477_);
lean_dec_ref(v___x_3474_);
v_a_3478_ = lean_ctor_get(v_result_3475_, 0);
lean_inc(v_a_3478_);
lean_dec_ref_known(v_result_3475_, 1);
v___x_3479_ = lp_algalVerification_Algal_Expr_containsLoop(v_a_3478_, v_a_3471_);
v_fst_3480_ = lean_ctor_get(v___x_3479_, 0);
lean_inc(v_fst_3480_);
v_snd_3481_ = lean_ctor_get(v___x_3479_, 1);
lean_inc(v_snd_3481_);
lean_dec_ref(v___x_3479_);
v___x_3482_ = lean_alloc_ctor(1, 0, 1);
v___x_3483_ = lean_unbox(v_fst_3480_);
lean_dec(v_fst_3480_);
lean_ctor_set_uint8(v___x_3482_, 0, v___x_3483_);
v___x_3484_ = lp_algalVerification_Algal_Expr_charged___redArg(v___x_3482_, v_snd_3481_);
v_result_3485_ = lean_ctor_get(v___x_3484_, 0);
lean_inc_ref(v_result_3485_);
v_charges_3486_ = lean_ctor_get(v___x_3484_, 1);
lean_inc(v_charges_3486_);
lean_dec_ref(v___x_3484_);
v___x_3487_ = l_List_appendTR___redArg(v_charges_3477_, v_charges_3486_);
v_result_3457_ = v_result_3485_;
v_charges_3458_ = v___x_3487_;
goto v___jp_3456_;
}
}
}
v___jp_3456_:
{
lean_object* v___x_3459_; lean_object* v___x_3460_; 
v___x_3459_ = lean_box(0);
v___x_3460_ = l_List_appendTR___redArg(v___x_3459_, v_charges_3458_);
v_result_3444_ = v_result_3457_;
v_charges_3445_ = v___x_3460_;
goto v___jp_3443_;
}
}
}
v___jp_3443_:
{
lean_object* v_charges_3446_; lean_object* v___x_3447_; 
v_charges_3446_ = lean_ctor_get(v___x_3442_, 1);
lean_inc(v_charges_3446_);
lean_dec_ref(v___x_3442_);
v___x_3447_ = l_List_appendTR___redArg(v_charges_3446_, v_charges_3445_);
v_result_2558_ = v_result_3444_;
v_charges_2559_ = v___x_3447_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_3491_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3491_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3491_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3492_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3492_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3492_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3493_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3493_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3493_;
goto v___jp_2571_;
}
}
}
else
{
lean_del_object(v___x_2584_);
if (lean_obj_tag(v_rest_2552_) == 1)
{
lean_object* v_rest_3494_; 
v_rest_3494_ = lean_ctor_get(v_rest_2552_, 1);
if (lean_obj_tag(v_rest_3494_) == 1)
{
lean_object* v_rest_3495_; 
v_rest_3495_ = lean_ctor_get(v_rest_3494_, 1);
if (lean_obj_tag(v_rest_3495_) == 1)
{
lean_object* v_rest_3496_; 
v_rest_3496_ = lean_ctor_get(v_rest_3495_, 1);
if (lean_obj_tag(v_rest_3496_) == 1)
{
lean_object* v_rest_3497_; 
v_rest_3497_ = lean_ctor_get(v_rest_3496_, 1);
if (lean_obj_tag(v_rest_3497_) == 1)
{
lean_object* v_rest_3498_; 
v_rest_3498_ = lean_ctor_get(v_rest_3497_, 1);
if (lean_obj_tag(v_rest_3498_) == 0)
{
lean_object* v_value_3499_; lean_object* v_value_3500_; lean_object* v_value_3501_; lean_object* v_value_3502_; lean_object* v_value_3503_; lean_object* v___x_3505_; 
lean_inc_ref(v_rest_3497_);
lean_inc_ref(v_rest_3496_);
lean_inc_ref(v_rest_3495_);
lean_inc_ref(v_rest_3494_);
lean_dec(v___x_2554_);
v_value_3499_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_3499_);
lean_dec_ref_known(v_rest_2552_, 2);
v_value_3500_ = lean_ctor_get(v_rest_3494_, 0);
lean_inc(v_value_3500_);
lean_dec_ref_known(v_rest_3494_, 2);
v_value_3501_ = lean_ctor_get(v_rest_3495_, 0);
lean_inc(v_value_3501_);
lean_dec_ref_known(v_rest_3495_, 2);
v_value_3502_ = lean_ctor_get(v_rest_3496_, 0);
lean_inc(v_value_3502_);
lean_dec_ref_known(v_rest_3496_, 2);
v_value_3503_ = lean_ctor_get(v_rest_3497_, 0);
lean_inc(v_value_3503_);
lean_dec_ref_known(v_rest_3497_, 2);
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_3499_);
v___x_3505_ = v___x_2519_;
goto v_reusejp_3504_;
}
else
{
lean_object* v_reuseFailAlloc_3552_; 
v_reuseFailAlloc_3552_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3552_, 0, v_value_3499_);
v___x_3505_ = v_reuseFailAlloc_3552_;
goto v_reusejp_3504_;
}
v_reusejp_3504_:
{
lean_object* v___x_3506_; lean_object* v_result_3508_; lean_object* v_charges_3509_; lean_object* v_result_3512_; 
lean_inc(v_scope_2515_);
v___x_3506_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3505_);
v_result_3512_ = lean_ctor_get(v___x_3506_, 0);
lean_inc_ref(v_result_3512_);
if (lean_obj_tag(v_result_3512_) == 0)
{
lean_object* v_charges_3513_; 
lean_dec(v_value_3503_);
lean_dec(v_value_3502_);
lean_dec(v_value_3501_);
lean_dec(v_value_3500_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_charges_3513_ = lean_ctor_get(v___x_3506_, 1);
lean_inc(v_charges_3513_);
lean_dec_ref(v___x_3506_);
v_result_2558_ = v_result_3512_;
v_charges_2559_ = v_charges_3513_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_3514_; lean_object* v___x_3516_; uint8_t v_isShared_3517_; uint8_t v_isSharedCheck_3551_; 
v_a_3514_ = lean_ctor_get(v_result_3512_, 0);
v_isSharedCheck_3551_ = !lean_is_exclusive(v_result_3512_);
if (v_isSharedCheck_3551_ == 0)
{
v___x_3516_ = v_result_3512_;
v_isShared_3517_ = v_isSharedCheck_3551_;
goto v_resetjp_3515_;
}
else
{
lean_inc(v_a_3514_);
lean_dec(v_result_3512_);
v___x_3516_ = lean_box(0);
v_isShared_3517_ = v_isSharedCheck_3551_;
goto v_resetjp_3515_;
}
v_resetjp_3515_:
{
lean_object* v___x_3518_; lean_object* v___x_3519_; lean_object* v_result_3521_; lean_object* v_charges_3522_; lean_object* v_result_3525_; lean_object* v___x_3526_; 
v___x_3518_ = lean_unsigned_to_nat(0u);
v___x_3519_ = lp_algalVerification_Algal_Expr_asList(v_value_2553_, v___x_3518_, v_a_3514_);
v_result_3525_ = lean_ctor_get(v___x_3519_, 0);
lean_inc_ref(v_result_3525_);
lean_dec_ref(v___x_3519_);
v___x_3526_ = lean_box(0);
if (lean_obj_tag(v_result_3525_) == 0)
{
lean_object* v_a_3527_; lean_object* v___x_3529_; uint8_t v_isShared_3530_; uint8_t v_isSharedCheck_3534_; 
lean_del_object(v___x_3516_);
lean_dec(v_value_3503_);
lean_dec(v_value_3502_);
lean_dec(v_value_3501_);
lean_dec(v_value_3500_);
lean_dec(v_scope_2515_);
v_a_3527_ = lean_ctor_get(v_result_3525_, 0);
v_isSharedCheck_3534_ = !lean_is_exclusive(v_result_3525_);
if (v_isSharedCheck_3534_ == 0)
{
v___x_3529_ = v_result_3525_;
v_isShared_3530_ = v_isSharedCheck_3534_;
goto v_resetjp_3528_;
}
else
{
lean_inc(v_a_3527_);
lean_dec(v_result_3525_);
v___x_3529_ = lean_box(0);
v_isShared_3530_ = v_isSharedCheck_3534_;
goto v_resetjp_3528_;
}
v_resetjp_3528_:
{
lean_object* v___x_3532_; 
if (v_isShared_3530_ == 0)
{
v___x_3532_ = v___x_3529_;
goto v_reusejp_3531_;
}
else
{
lean_object* v_reuseFailAlloc_3533_; 
v_reuseFailAlloc_3533_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3533_, 0, v_a_3527_);
v___x_3532_ = v_reuseFailAlloc_3533_;
goto v_reusejp_3531_;
}
v_reusejp_3531_:
{
v_result_3508_ = v___x_3532_;
v_charges_3509_ = v___x_3526_;
goto v___jp_3507_;
}
}
}
else
{
lean_object* v_a_3535_; lean_object* v___x_3537_; 
v_a_3535_ = lean_ctor_get(v_result_3525_, 0);
lean_inc(v_a_3535_);
lean_dec_ref_known(v_result_3525_, 1);
if (v_isShared_3517_ == 0)
{
lean_ctor_set_tag(v___x_3516_, 0);
lean_ctor_set(v___x_3516_, 0, v_value_3500_);
v___x_3537_ = v___x_3516_;
goto v_reusejp_3536_;
}
else
{
lean_object* v_reuseFailAlloc_3550_; 
v_reuseFailAlloc_3550_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3550_, 0, v_value_3500_);
v___x_3537_ = v_reuseFailAlloc_3550_;
goto v_reusejp_3536_;
}
v_reusejp_3536_:
{
lean_object* v___x_3538_; lean_object* v_result_3539_; 
lean_inc(v_scope_2515_);
v___x_3538_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3537_);
v_result_3539_ = lean_ctor_get(v___x_3538_, 0);
lean_inc_ref(v_result_3539_);
if (lean_obj_tag(v_result_3539_) == 0)
{
lean_object* v_charges_3540_; 
lean_dec(v_a_3535_);
lean_dec(v_value_3503_);
lean_dec(v_value_3502_);
lean_dec(v_value_3501_);
lean_dec(v_scope_2515_);
v_charges_3540_ = lean_ctor_get(v___x_3538_, 1);
lean_inc(v_charges_3540_);
lean_dec_ref(v___x_3538_);
v_result_3521_ = v_result_3539_;
v_charges_3522_ = v_charges_3540_;
goto v___jp_3520_;
}
else
{
lean_object* v_charges_3541_; lean_object* v_a_3542_; lean_object* v___x_3543_; lean_object* v___x_3544_; lean_object* v___x_3545_; lean_object* v___x_3546_; lean_object* v_result_3547_; lean_object* v_charges_3548_; lean_object* v___x_3549_; 
v_charges_3541_ = lean_ctor_get(v___x_3538_, 1);
lean_inc(v_charges_3541_);
lean_dec_ref(v___x_3538_);
v_a_3542_ = lean_ctor_get(v_result_3539_, 0);
lean_inc(v_a_3542_);
lean_dec_ref_known(v_result_3539_, 1);
v___x_3543_ = lp_algalVerification_Algal_Expr_binderName(v_value_3501_);
lean_dec(v_value_3501_);
v___x_3544_ = lp_algalVerification_Algal_Expr_binderName(v_value_3502_);
lean_dec(v_value_3502_);
v___x_3545_ = lean_alloc_ctor(6, 5, 0);
lean_ctor_set(v___x_3545_, 0, v___x_3543_);
lean_ctor_set(v___x_3545_, 1, v___x_3544_);
lean_ctor_set(v___x_3545_, 2, v_value_3503_);
lean_ctor_set(v___x_3545_, 3, v_a_3542_);
lean_ctor_set(v___x_3545_, 4, v_a_3535_);
v___x_3546_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3545_);
v_result_3547_ = lean_ctor_get(v___x_3546_, 0);
lean_inc_ref(v_result_3547_);
v_charges_3548_ = lean_ctor_get(v___x_3546_, 1);
lean_inc(v_charges_3548_);
lean_dec_ref(v___x_3546_);
v___x_3549_ = l_List_appendTR___redArg(v_charges_3541_, v_charges_3548_);
v_result_3521_ = v_result_3547_;
v_charges_3522_ = v___x_3549_;
goto v___jp_3520_;
}
}
}
v___jp_3520_:
{
lean_object* v___x_3523_; lean_object* v___x_3524_; 
v___x_3523_ = lean_box(0);
v___x_3524_ = l_List_appendTR___redArg(v___x_3523_, v_charges_3522_);
v_result_3508_ = v_result_3521_;
v_charges_3509_ = v___x_3524_;
goto v___jp_3507_;
}
}
}
v___jp_3507_:
{
lean_object* v_charges_3510_; lean_object* v___x_3511_; 
v_charges_3510_ = lean_ctor_get(v___x_3506_, 1);
lean_inc(v_charges_3510_);
lean_dec_ref(v___x_3506_);
v___x_3511_ = l_List_appendTR___redArg(v_charges_3510_, v_charges_3509_);
v_result_2558_ = v_result_3508_;
v_charges_2559_ = v___x_3511_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_3553_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3553_ = lp_algalVerification_Algal_Expr_machine___lam__24(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3553_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3554_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3554_ = lp_algalVerification_Algal_Expr_machine___lam__24(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3554_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3555_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3555_ = lp_algalVerification_Algal_Expr_machine___lam__24(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3555_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3556_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3556_ = lp_algalVerification_Algal_Expr_machine___lam__24(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3556_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3557_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3557_ = lp_algalVerification_Algal_Expr_machine___lam__24(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3557_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3558_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3558_ = lp_algalVerification_Algal_Expr_machine___lam__24(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3558_;
goto v___jp_2571_;
}
}
}
else
{
lean_object* v___x_3559_; lean_object* v___x_3560_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
v___x_3559_ = lean_box(0);
v___x_3560_ = lp_algalVerification_Algal_Expr_machine___lam__11(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_3559_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3560_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3561_; lean_object* v___x_3562_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
v___x_3561_ = lean_box(0);
v___x_3562_ = lp_algalVerification_Algal_Expr_machine___lam__11(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_3561_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3562_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3563_; lean_object* v___x_3564_; lean_object* v___x_3565_; lean_object* v_result_3567_; lean_object* v_charges_3568_; lean_object* v_result_3571_; lean_object* v___x_3572_; 
lean_del_object(v___x_2584_);
lean_dec(v___x_2554_);
lean_del_object(v___x_2519_);
v___x_3563_ = lean_unsigned_to_nat(1u);
v___x_3564_ = lean_box(0);
lean_inc_ref(v_value_2553_);
v___x_3565_ = lp_algalVerification_Algal_Expr_checkArity(v_value_2553_, v_rest_2552_, v___x_3563_, v___x_3564_);
v_result_3571_ = lean_ctor_get(v___x_3565_, 0);
lean_inc_ref(v_result_3571_);
lean_dec_ref(v___x_3565_);
v___x_3572_ = lean_box(0);
if (lean_obj_tag(v_result_3571_) == 0)
{
lean_object* v_a_3573_; lean_object* v___x_3575_; uint8_t v_isShared_3576_; uint8_t v_isSharedCheck_3580_; 
lean_dec_ref(v_value_2553_);
lean_dec(v_rest_2552_);
lean_dec(v_scope_2515_);
v_a_3573_ = lean_ctor_get(v_result_3571_, 0);
v_isSharedCheck_3580_ = !lean_is_exclusive(v_result_3571_);
if (v_isSharedCheck_3580_ == 0)
{
v___x_3575_ = v_result_3571_;
v_isShared_3576_ = v_isSharedCheck_3580_;
goto v_resetjp_3574_;
}
else
{
lean_inc(v_a_3573_);
lean_dec(v_result_3571_);
v___x_3575_ = lean_box(0);
v_isShared_3576_ = v_isSharedCheck_3580_;
goto v_resetjp_3574_;
}
v_resetjp_3574_:
{
lean_object* v___x_3578_; 
if (v_isShared_3576_ == 0)
{
v___x_3578_ = v___x_3575_;
goto v_reusejp_3577_;
}
else
{
lean_object* v_reuseFailAlloc_3579_; 
v_reuseFailAlloc_3579_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3579_, 0, v_a_3573_);
v___x_3578_ = v_reuseFailAlloc_3579_;
goto v_reusejp_3577_;
}
v_reusejp_3577_:
{
v_result_2558_ = v___x_3578_;
v_charges_2559_ = v___x_3572_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_3581_; lean_object* v___x_3582_; lean_object* v___x_3583_; lean_object* v___x_3584_; lean_object* v_result_3586_; lean_object* v_charges_3587_; lean_object* v_result_3590_; 
lean_dec_ref_known(v_result_3571_, 1);
v___x_3581_ = lean_box(0);
v___x_3582_ = lean_unsigned_to_nat(2u);
v___x_3583_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v___x_3583_, 0, v_rest_2552_);
lean_ctor_set(v___x_3583_, 1, v___x_3581_);
lean_ctor_set(v___x_3583_, 2, v___x_3582_);
v___x_3584_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3583_);
v_result_3590_ = lean_ctor_get(v___x_3584_, 0);
lean_inc_ref(v_result_3590_);
if (lean_obj_tag(v_result_3590_) == 0)
{
lean_object* v_charges_3591_; 
lean_dec_ref(v_value_2553_);
v_charges_3591_ = lean_ctor_get(v___x_3584_, 1);
lean_inc(v_charges_3591_);
lean_dec_ref(v___x_3584_);
v_result_3567_ = v_result_3590_;
v_charges_3568_ = v_charges_3591_;
goto v___jp_3566_;
}
else
{
lean_object* v_a_3592_; 
v_a_3592_ = lean_ctor_get(v_result_3590_, 0);
lean_inc(v_a_3592_);
lean_dec_ref_known(v_result_3590_, 1);
if (lean_obj_tag(v_a_3592_) == 4)
{
lean_object* v_values_3593_; lean_object* v___x_3595_; uint8_t v_isShared_3596_; uint8_t v_isSharedCheck_3637_; 
v_values_3593_ = lean_ctor_get(v_a_3592_, 0);
v_isSharedCheck_3637_ = !lean_is_exclusive(v_a_3592_);
if (v_isSharedCheck_3637_ == 0)
{
v___x_3595_ = v_a_3592_;
v_isShared_3596_ = v_isSharedCheck_3637_;
goto v_resetjp_3594_;
}
else
{
lean_inc(v_values_3593_);
lean_dec(v_a_3592_);
v___x_3595_ = lean_box(0);
v_isShared_3596_ = v_isSharedCheck_3637_;
goto v_resetjp_3594_;
}
v_resetjp_3594_:
{
lean_object* v___x_3597_; lean_object* v___x_3598_; lean_object* v___x_3599_; lean_object* v_result_3601_; lean_object* v_charges_3602_; lean_object* v_result_3604_; 
v___x_3597_ = lean_unsigned_to_nat(0u);
v___x_3598_ = lp_algalVerification_Algal_Expr_listCount(v_value_2553_, v_values_3593_, v___x_3597_, v___x_3597_);
v___x_3599_ = lp_algalVerification_Algal_Expr_liftE___redArg(v___x_3598_);
v_result_3604_ = lean_ctor_get(v___x_3599_, 0);
lean_inc_ref(v_result_3604_);
lean_dec_ref(v___x_3599_);
if (lean_obj_tag(v_result_3604_) == 0)
{
lean_object* v_a_3605_; lean_object* v___x_3607_; uint8_t v_isShared_3608_; uint8_t v_isSharedCheck_3612_; 
lean_del_object(v___x_3595_);
lean_dec(v_values_3593_);
v_a_3605_ = lean_ctor_get(v_result_3604_, 0);
v_isSharedCheck_3612_ = !lean_is_exclusive(v_result_3604_);
if (v_isSharedCheck_3612_ == 0)
{
v___x_3607_ = v_result_3604_;
v_isShared_3608_ = v_isSharedCheck_3612_;
goto v_resetjp_3606_;
}
else
{
lean_inc(v_a_3605_);
lean_dec(v_result_3604_);
v___x_3607_ = lean_box(0);
v_isShared_3608_ = v_isSharedCheck_3612_;
goto v_resetjp_3606_;
}
v_resetjp_3606_:
{
lean_object* v___x_3610_; 
if (v_isShared_3608_ == 0)
{
v___x_3610_ = v___x_3607_;
goto v_reusejp_3609_;
}
else
{
lean_object* v_reuseFailAlloc_3611_; 
v_reuseFailAlloc_3611_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3611_, 0, v_a_3605_);
v___x_3610_ = v_reuseFailAlloc_3611_;
goto v_reusejp_3609_;
}
v_reusejp_3609_:
{
v_result_3586_ = v___x_3610_;
v_charges_3587_ = v___x_3572_;
goto v___jp_3585_;
}
}
}
else
{
lean_object* v_a_3613_; lean_object* v___x_3614_; lean_object* v_result_3616_; lean_object* v_charges_3617_; lean_object* v_result_3620_; lean_object* v___x_3622_; uint8_t v_isShared_3623_; uint8_t v_isSharedCheck_3635_; 
v_a_3613_ = lean_ctor_get(v_result_3604_, 0);
lean_inc_n(v_a_3613_, 2);
lean_dec_ref_known(v_result_3604_, 1);
v___x_3614_ = lp_algalVerification_Algal_Expr_charge(v_a_3613_);
v_result_3620_ = lean_ctor_get(v___x_3614_, 0);
lean_inc_ref(v_result_3620_);
v_isSharedCheck_3635_ = !lean_is_exclusive(v_result_3620_);
if (v_isSharedCheck_3635_ == 0)
{
lean_object* v_unused_3636_; 
v_unused_3636_ = lean_ctor_get(v_result_3620_, 0);
lean_dec(v_unused_3636_);
v___x_3622_ = v_result_3620_;
v_isShared_3623_ = v_isSharedCheck_3635_;
goto v_resetjp_3621_;
}
else
{
lean_dec(v_result_3620_);
v___x_3622_ = lean_box(0);
v_isShared_3623_ = v_isSharedCheck_3635_;
goto v_resetjp_3621_;
}
v___jp_3615_:
{
lean_object* v_charges_3618_; lean_object* v___x_3619_; 
v_charges_3618_ = lean_ctor_get(v___x_3614_, 1);
lean_inc(v_charges_3618_);
lean_dec_ref(v___x_3614_);
v___x_3619_ = l_List_appendTR___redArg(v_charges_3618_, v_charges_3617_);
v_result_3601_ = v_result_3616_;
v_charges_3602_ = v___x_3619_;
goto v___jp_3600_;
}
v_resetjp_3621_:
{
lean_object* v___x_3624_; uint8_t v___x_3625_; 
v___x_3624_ = lean_unsigned_to_nat(1024u);
v___x_3625_ = lean_nat_dec_lt(v___x_3624_, v_a_3613_);
lean_dec(v_a_3613_);
if (v___x_3625_ == 0)
{
lean_object* v___x_3626_; lean_object* v___x_3628_; 
v___x_3626_ = lp_algalVerification_Algal_Expr_listsOnto(v___x_3581_, v_values_3593_);
lean_dec(v_values_3593_);
if (v_isShared_3596_ == 0)
{
lean_ctor_set(v___x_3595_, 0, v___x_3626_);
v___x_3628_ = v___x_3595_;
goto v_reusejp_3627_;
}
else
{
lean_object* v_reuseFailAlloc_3632_; 
v_reuseFailAlloc_3632_ = lean_alloc_ctor(4, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3632_, 0, v___x_3626_);
v___x_3628_ = v_reuseFailAlloc_3632_;
goto v_reusejp_3627_;
}
v_reusejp_3627_:
{
lean_object* v___x_3630_; 
if (v_isShared_3623_ == 0)
{
lean_ctor_set(v___x_3622_, 0, v___x_3628_);
v___x_3630_ = v___x_3622_;
goto v_reusejp_3629_;
}
else
{
lean_object* v_reuseFailAlloc_3631_; 
v_reuseFailAlloc_3631_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3631_, 0, v___x_3628_);
v___x_3630_ = v_reuseFailAlloc_3631_;
goto v_reusejp_3629_;
}
v_reusejp_3629_:
{
v_result_3616_ = v___x_3630_;
v_charges_3617_ = v___x_3572_;
goto v___jp_3615_;
}
}
}
else
{
lean_object* v___x_3633_; lean_object* v_result_3634_; 
lean_del_object(v___x_3622_);
lean_del_object(v___x_3595_);
lean_dec(v_values_3593_);
v___x_3633_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___closed__42, &lp_algalVerification_Algal_Expr_machine___closed__42_once, _init_lp_algalVerification_Algal_Expr_machine___closed__42);
v_result_3634_ = lean_ctor_get(v___x_3633_, 0);
lean_inc_ref(v_result_3634_);
v_result_3616_ = v_result_3634_;
v_charges_3617_ = v___x_3572_;
goto v___jp_3615_;
}
}
}
v___jp_3600_:
{
lean_object* v___x_3603_; 
v___x_3603_ = l_List_appendTR___redArg(v___x_3572_, v_charges_3602_);
v_result_3586_ = v_result_3601_;
v_charges_3587_ = v___x_3603_;
goto v___jp_3585_;
}
}
}
else
{
lean_object* v___x_3638_; lean_object* v_result_3639_; 
lean_dec(v_a_3592_);
lean_dec_ref(v_value_2553_);
v___x_3638_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__6___closed__0, &lp_algalVerification_Algal_Expr_machine___lam__6___closed__0_once, _init_lp_algalVerification_Algal_Expr_machine___lam__6___closed__0);
v_result_3639_ = lean_ctor_get(v___x_3638_, 0);
lean_inc_ref(v_result_3639_);
v_result_3586_ = v_result_3639_;
v_charges_3587_ = v___x_3572_;
goto v___jp_3585_;
}
}
v___jp_3585_:
{
lean_object* v_charges_3588_; lean_object* v___x_3589_; 
v_charges_3588_ = lean_ctor_get(v___x_3584_, 1);
lean_inc(v_charges_3588_);
lean_dec_ref(v___x_3584_);
v___x_3589_ = l_List_appendTR___redArg(v_charges_3588_, v_charges_3587_);
v_result_3567_ = v_result_3586_;
v_charges_3568_ = v___x_3589_;
goto v___jp_3566_;
}
}
v___jp_3566_:
{
lean_object* v___x_3569_; lean_object* v___x_3570_; 
v___x_3569_ = lean_box(0);
v___x_3570_ = l_List_appendTR___redArg(v___x_3569_, v_charges_3568_);
v_result_2558_ = v_result_3567_;
v_charges_2559_ = v___x_3570_;
goto v___jp_2557_;
}
}
}
else
{
lean_del_object(v___x_2584_);
if (lean_obj_tag(v_rest_2552_) == 1)
{
lean_object* v_rest_3640_; 
v_rest_3640_ = lean_ctor_get(v_rest_2552_, 1);
if (lean_obj_tag(v_rest_3640_) == 1)
{
lean_object* v_rest_3641_; 
v_rest_3641_ = lean_ctor_get(v_rest_3640_, 1);
if (lean_obj_tag(v_rest_3641_) == 0)
{
lean_object* v_value_3642_; lean_object* v_value_3643_; lean_object* v___x_3645_; 
lean_inc_ref(v_rest_3640_);
lean_dec(v___x_2554_);
v_value_3642_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_3642_);
lean_dec_ref_known(v_rest_2552_, 2);
v_value_3643_ = lean_ctor_get(v_rest_3640_, 0);
lean_inc(v_value_3643_);
lean_dec_ref_known(v_rest_3640_, 2);
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_3642_);
v___x_3645_ = v___x_2519_;
goto v_reusejp_3644_;
}
else
{
lean_object* v_reuseFailAlloc_3729_; 
v_reuseFailAlloc_3729_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3729_, 0, v_value_3642_);
v___x_3645_ = v_reuseFailAlloc_3729_;
goto v_reusejp_3644_;
}
v_reusejp_3644_:
{
lean_object* v___x_3646_; lean_object* v_result_3648_; lean_object* v_charges_3649_; lean_object* v_result_3652_; 
lean_inc(v_scope_2515_);
v___x_3646_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3645_);
v_result_3652_ = lean_ctor_get(v___x_3646_, 0);
lean_inc_ref(v_result_3652_);
if (lean_obj_tag(v_result_3652_) == 0)
{
lean_object* v_charges_3653_; 
lean_dec(v_value_3643_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_charges_3653_ = lean_ctor_get(v___x_3646_, 1);
lean_inc(v_charges_3653_);
lean_dec_ref(v___x_3646_);
v_result_2558_ = v_result_3652_;
v_charges_2559_ = v_charges_3653_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_3654_; lean_object* v___x_3656_; uint8_t v_isShared_3657_; uint8_t v_isSharedCheck_3728_; 
v_a_3654_ = lean_ctor_get(v_result_3652_, 0);
v_isSharedCheck_3728_ = !lean_is_exclusive(v_result_3652_);
if (v_isSharedCheck_3728_ == 0)
{
v___x_3656_ = v_result_3652_;
v_isShared_3657_ = v_isSharedCheck_3728_;
goto v_resetjp_3655_;
}
else
{
lean_inc(v_a_3654_);
lean_dec(v_result_3652_);
v___x_3656_ = lean_box(0);
v_isShared_3657_ = v_isSharedCheck_3728_;
goto v_resetjp_3655_;
}
v_resetjp_3655_:
{
lean_object* v___x_3658_; lean_object* v___x_3659_; lean_object* v_result_3661_; lean_object* v_charges_3662_; lean_object* v_result_3665_; lean_object* v___x_3666_; 
v___x_3658_ = lean_unsigned_to_nat(0u);
lean_inc_ref(v_value_2553_);
v___x_3659_ = lp_algalVerification_Algal_Expr_asList(v_value_2553_, v___x_3658_, v_a_3654_);
v_result_3665_ = lean_ctor_get(v___x_3659_, 0);
lean_inc_ref(v_result_3665_);
lean_dec_ref(v___x_3659_);
v___x_3666_ = lean_box(0);
if (lean_obj_tag(v_result_3665_) == 0)
{
lean_object* v_a_3667_; lean_object* v___x_3669_; uint8_t v_isShared_3670_; uint8_t v_isSharedCheck_3674_; 
lean_del_object(v___x_3656_);
lean_dec(v_value_3643_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_a_3667_ = lean_ctor_get(v_result_3665_, 0);
v_isSharedCheck_3674_ = !lean_is_exclusive(v_result_3665_);
if (v_isSharedCheck_3674_ == 0)
{
v___x_3669_ = v_result_3665_;
v_isShared_3670_ = v_isSharedCheck_3674_;
goto v_resetjp_3668_;
}
else
{
lean_inc(v_a_3667_);
lean_dec(v_result_3665_);
v___x_3669_ = lean_box(0);
v_isShared_3670_ = v_isSharedCheck_3674_;
goto v_resetjp_3668_;
}
v_resetjp_3668_:
{
lean_object* v___x_3672_; 
if (v_isShared_3670_ == 0)
{
v___x_3672_ = v___x_3669_;
goto v_reusejp_3671_;
}
else
{
lean_object* v_reuseFailAlloc_3673_; 
v_reuseFailAlloc_3673_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3673_, 0, v_a_3667_);
v___x_3672_ = v_reuseFailAlloc_3673_;
goto v_reusejp_3671_;
}
v_reusejp_3671_:
{
v_result_3648_ = v___x_3672_;
v_charges_3649_ = v___x_3666_;
goto v___jp_3647_;
}
}
}
else
{
lean_object* v_a_3675_; lean_object* v___x_3677_; 
v_a_3675_ = lean_ctor_get(v_result_3665_, 0);
lean_inc(v_a_3675_);
lean_dec_ref_known(v_result_3665_, 1);
if (v_isShared_3657_ == 0)
{
lean_ctor_set_tag(v___x_3656_, 0);
lean_ctor_set(v___x_3656_, 0, v_value_3643_);
v___x_3677_ = v___x_3656_;
goto v_reusejp_3676_;
}
else
{
lean_object* v_reuseFailAlloc_3727_; 
v_reuseFailAlloc_3727_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3727_, 0, v_value_3643_);
v___x_3677_ = v_reuseFailAlloc_3727_;
goto v_reusejp_3676_;
}
v_reusejp_3676_:
{
lean_object* v___x_3678_; lean_object* v_result_3680_; lean_object* v_charges_3681_; lean_object* v_result_3684_; 
v___x_3678_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3677_);
v_result_3684_ = lean_ctor_get(v___x_3678_, 0);
lean_inc_ref(v_result_3684_);
if (lean_obj_tag(v_result_3684_) == 0)
{
lean_object* v_charges_3685_; 
lean_dec(v_a_3675_);
lean_dec_ref(v_value_2553_);
v_charges_3685_ = lean_ctor_get(v___x_3678_, 1);
lean_inc(v_charges_3685_);
lean_dec_ref(v___x_3678_);
v_result_3661_ = v_result_3684_;
v_charges_3662_ = v_charges_3685_;
goto v___jp_3660_;
}
else
{
lean_object* v_a_3686_; lean_object* v___x_3687_; lean_object* v___x_3688_; lean_object* v_result_3690_; lean_object* v_charges_3691_; lean_object* v___y_3694_; lean_object* v_result_3697_; 
v_a_3686_ = lean_ctor_get(v_result_3684_, 0);
lean_inc(v_a_3686_);
lean_dec_ref_known(v_result_3684_, 1);
v___x_3687_ = lean_unsigned_to_nat(1u);
lean_inc_ref(v_value_2553_);
v___x_3688_ = lp_algalVerification_Algal_Expr_asIndex(v_value_2553_, v___x_3687_, v_a_3686_);
lean_dec(v_a_3686_);
v_result_3697_ = lean_ctor_get(v___x_3688_, 0);
lean_inc_ref(v_result_3697_);
lean_dec_ref(v___x_3688_);
if (lean_obj_tag(v_result_3697_) == 0)
{
lean_object* v_a_3698_; lean_object* v___x_3700_; uint8_t v_isShared_3701_; uint8_t v_isSharedCheck_3705_; 
lean_dec(v_a_3675_);
lean_dec_ref(v_value_2553_);
v_a_3698_ = lean_ctor_get(v_result_3697_, 0);
v_isSharedCheck_3705_ = !lean_is_exclusive(v_result_3697_);
if (v_isSharedCheck_3705_ == 0)
{
v___x_3700_ = v_result_3697_;
v_isShared_3701_ = v_isSharedCheck_3705_;
goto v_resetjp_3699_;
}
else
{
lean_inc(v_a_3698_);
lean_dec(v_result_3697_);
v___x_3700_ = lean_box(0);
v_isShared_3701_ = v_isSharedCheck_3705_;
goto v_resetjp_3699_;
}
v_resetjp_3699_:
{
lean_object* v___x_3703_; 
if (v_isShared_3701_ == 0)
{
v___x_3703_ = v___x_3700_;
goto v_reusejp_3702_;
}
else
{
lean_object* v_reuseFailAlloc_3704_; 
v_reuseFailAlloc_3704_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3704_, 0, v_a_3698_);
v___x_3703_ = v_reuseFailAlloc_3704_;
goto v_reusejp_3702_;
}
v_reusejp_3702_:
{
v_result_3680_ = v___x_3703_;
v_charges_3681_ = v___x_3666_;
goto v___jp_3679_;
}
}
}
else
{
lean_object* v_a_3706_; lean_object* v___x_3708_; uint8_t v_isShared_3709_; uint8_t v_isSharedCheck_3726_; 
v_a_3706_ = lean_ctor_get(v_result_3697_, 0);
v_isSharedCheck_3726_ = !lean_is_exclusive(v_result_3697_);
if (v_isSharedCheck_3726_ == 0)
{
v___x_3708_ = v_result_3697_;
v_isShared_3709_ = v_isSharedCheck_3726_;
goto v_resetjp_3707_;
}
else
{
lean_inc(v_a_3706_);
lean_dec(v_result_3697_);
v___x_3708_ = lean_box(0);
v_isShared_3709_ = v_isSharedCheck_3726_;
goto v_resetjp_3707_;
}
v_resetjp_3707_:
{
lean_object* v___x_3710_; double v___x_3711_; double v___x_3712_; uint8_t v___x_3713_; 
v___x_3710_ = lp_algalVerification_Algal_Expr_itemsLength(v_a_3675_);
lean_inc(v___x_3710_);
v___x_3711_ = lean_float_of_nat(v___x_3710_);
v___x_3712_ = lean_unbox_float(v_a_3706_);
v___x_3713_ = lean_float_decLe(v___x_3711_, v___x_3712_);
if (v___x_3713_ == 0)
{
double v___x_3714_; lean_object* v___x_3715_; 
v___x_3714_ = lean_unbox_float(v_a_3706_);
v___x_3715_ = lp_algalVerification_Algal_Expr_itemsGetF(v_a_3675_, v___x_3714_);
lean_dec(v_a_3675_);
if (lean_obj_tag(v___x_3715_) == 0)
{
double v___x_3716_; lean_object* v___x_3717_; lean_object* v___x_3718_; 
lean_del_object(v___x_3708_);
v___x_3716_ = lean_unbox_float(v_a_3706_);
lean_dec(v_a_3706_);
v___x_3717_ = lp_algalVerification_Algal_Expr_errNthRange(v_value_2553_, v___x_3716_, v___x_3710_);
v___x_3718_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_3717_);
v___y_3694_ = v___x_3718_;
goto v___jp_3693_;
}
else
{
lean_object* v_val_3719_; lean_object* v___x_3721_; 
lean_dec(v___x_3710_);
lean_dec(v_a_3706_);
lean_dec_ref(v_value_2553_);
v_val_3719_ = lean_ctor_get(v___x_3715_, 0);
lean_inc(v_val_3719_);
lean_dec_ref_known(v___x_3715_, 1);
if (v_isShared_3709_ == 0)
{
lean_ctor_set(v___x_3708_, 0, v_val_3719_);
v___x_3721_ = v___x_3708_;
goto v_reusejp_3720_;
}
else
{
lean_object* v_reuseFailAlloc_3722_; 
v_reuseFailAlloc_3722_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3722_, 0, v_val_3719_);
v___x_3721_ = v_reuseFailAlloc_3722_;
goto v_reusejp_3720_;
}
v_reusejp_3720_:
{
v_result_3690_ = v___x_3721_;
v_charges_3691_ = v___x_3666_;
goto v___jp_3689_;
}
}
}
else
{
double v___x_3723_; lean_object* v___x_3724_; lean_object* v___x_3725_; 
lean_del_object(v___x_3708_);
lean_dec(v_a_3675_);
v___x_3723_ = lean_unbox_float(v_a_3706_);
lean_dec(v_a_3706_);
v___x_3724_ = lp_algalVerification_Algal_Expr_errNthRange(v_value_2553_, v___x_3723_, v___x_3710_);
v___x_3725_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_3724_);
v___y_3694_ = v___x_3725_;
goto v___jp_3693_;
}
}
}
v___jp_3689_:
{
lean_object* v___x_3692_; 
v___x_3692_ = l_List_appendTR___redArg(v___x_3666_, v_charges_3691_);
v_result_3680_ = v_result_3690_;
v_charges_3681_ = v___x_3692_;
goto v___jp_3679_;
}
v___jp_3693_:
{
lean_object* v_result_3695_; lean_object* v_charges_3696_; 
v_result_3695_ = lean_ctor_get(v___y_3694_, 0);
lean_inc_ref(v_result_3695_);
v_charges_3696_ = lean_ctor_get(v___y_3694_, 1);
lean_inc(v_charges_3696_);
lean_dec_ref(v___y_3694_);
v_result_3690_ = v_result_3695_;
v_charges_3691_ = v_charges_3696_;
goto v___jp_3689_;
}
}
v___jp_3679_:
{
lean_object* v_charges_3682_; lean_object* v___x_3683_; 
v_charges_3682_ = lean_ctor_get(v___x_3678_, 1);
lean_inc(v_charges_3682_);
lean_dec_ref(v___x_3678_);
v___x_3683_ = l_List_appendTR___redArg(v_charges_3682_, v_charges_3681_);
v_result_3661_ = v_result_3680_;
v_charges_3662_ = v___x_3683_;
goto v___jp_3660_;
}
}
}
v___jp_3660_:
{
lean_object* v___x_3663_; lean_object* v___x_3664_; 
v___x_3663_ = lean_box(0);
v___x_3664_ = l_List_appendTR___redArg(v___x_3663_, v_charges_3662_);
v_result_3648_ = v_result_3661_;
v_charges_3649_ = v___x_3664_;
goto v___jp_3647_;
}
}
}
v___jp_3647_:
{
lean_object* v_charges_3650_; lean_object* v___x_3651_; 
v_charges_3650_ = lean_ctor_get(v___x_3646_, 1);
lean_inc(v_charges_3650_);
lean_dec_ref(v___x_3646_);
v___x_3651_ = l_List_appendTR___redArg(v_charges_3650_, v_charges_3649_);
v_result_2558_ = v_result_3648_;
v_charges_2559_ = v___x_3651_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_3730_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3730_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3730_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3731_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3731_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3731_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3732_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3732_ = lp_algalVerification_Algal_Expr_machine___lam__18(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3732_;
goto v___jp_2571_;
}
}
}
else
{
lean_del_object(v___x_2584_);
if (lean_obj_tag(v_rest_2552_) == 1)
{
lean_object* v_rest_3733_; 
v_rest_3733_ = lean_ctor_get(v_rest_2552_, 1);
if (lean_obj_tag(v_rest_3733_) == 0)
{
lean_object* v_value_3734_; lean_object* v___x_3736_; 
lean_dec(v___x_2554_);
v_value_3734_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_3734_);
lean_dec_ref_known(v_rest_2552_, 2);
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_3734_);
v___x_3736_ = v___x_2519_;
goto v_reusejp_3735_;
}
else
{
lean_object* v_reuseFailAlloc_3770_; 
v_reuseFailAlloc_3770_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3770_, 0, v_value_3734_);
v___x_3736_ = v_reuseFailAlloc_3770_;
goto v_reusejp_3735_;
}
v_reusejp_3735_:
{
lean_object* v___x_3737_; lean_object* v_result_3739_; lean_object* v_charges_3740_; lean_object* v_result_3743_; 
v___x_3737_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3736_);
v_result_3743_ = lean_ctor_get(v___x_3737_, 0);
lean_inc_ref(v_result_3743_);
if (lean_obj_tag(v_result_3743_) == 0)
{
lean_object* v_charges_3744_; 
lean_dec_ref(v_value_2553_);
v_charges_3744_ = lean_ctor_get(v___x_3737_, 1);
lean_inc(v_charges_3744_);
lean_dec_ref(v___x_3737_);
v_result_2558_ = v_result_3743_;
v_charges_2559_ = v_charges_3744_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_3745_; lean_object* v___x_3746_; lean_object* v___x_3747_; lean_object* v_result_3748_; lean_object* v___x_3749_; 
v_a_3745_ = lean_ctor_get(v_result_3743_, 0);
lean_inc(v_a_3745_);
lean_dec_ref_known(v_result_3743_, 1);
v___x_3746_ = lean_unsigned_to_nat(0u);
v___x_3747_ = lp_algalVerification_Algal_Expr_asList(v_value_2553_, v___x_3746_, v_a_3745_);
v_result_3748_ = lean_ctor_get(v___x_3747_, 0);
lean_inc_ref(v_result_3748_);
lean_dec_ref(v___x_3747_);
v___x_3749_ = lean_box(0);
if (lean_obj_tag(v_result_3748_) == 0)
{
lean_object* v_a_3750_; lean_object* v___x_3752_; uint8_t v_isShared_3753_; uint8_t v_isSharedCheck_3757_; 
v_a_3750_ = lean_ctor_get(v_result_3748_, 0);
v_isSharedCheck_3757_ = !lean_is_exclusive(v_result_3748_);
if (v_isSharedCheck_3757_ == 0)
{
v___x_3752_ = v_result_3748_;
v_isShared_3753_ = v_isSharedCheck_3757_;
goto v_resetjp_3751_;
}
else
{
lean_inc(v_a_3750_);
lean_dec(v_result_3748_);
v___x_3752_ = lean_box(0);
v_isShared_3753_ = v_isSharedCheck_3757_;
goto v_resetjp_3751_;
}
v_resetjp_3751_:
{
lean_object* v___x_3755_; 
if (v_isShared_3753_ == 0)
{
v___x_3755_ = v___x_3752_;
goto v_reusejp_3754_;
}
else
{
lean_object* v_reuseFailAlloc_3756_; 
v_reuseFailAlloc_3756_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3756_, 0, v_a_3750_);
v___x_3755_ = v_reuseFailAlloc_3756_;
goto v_reusejp_3754_;
}
v_reusejp_3754_:
{
v_result_3739_ = v___x_3755_;
v_charges_3740_ = v___x_3749_;
goto v___jp_3738_;
}
}
}
else
{
lean_object* v_a_3758_; lean_object* v___x_3760_; uint8_t v_isShared_3761_; uint8_t v_isSharedCheck_3769_; 
v_a_3758_ = lean_ctor_get(v_result_3748_, 0);
v_isSharedCheck_3769_ = !lean_is_exclusive(v_result_3748_);
if (v_isSharedCheck_3769_ == 0)
{
v___x_3760_ = v_result_3748_;
v_isShared_3761_ = v_isSharedCheck_3769_;
goto v_resetjp_3759_;
}
else
{
lean_inc(v_a_3758_);
lean_dec(v_result_3748_);
v___x_3760_ = lean_box(0);
v_isShared_3761_ = v_isSharedCheck_3769_;
goto v_resetjp_3759_;
}
v_resetjp_3759_:
{
lean_object* v___x_3762_; uint64_t v___x_3763_; lean_object* v___x_3764_; lean_object* v___x_3766_; 
v___x_3762_ = lp_algalVerification_Algal_Expr_itemsLength(v_a_3758_);
lean_dec(v_a_3758_);
v___x_3763_ = lp_algalVerification_Algal_Expr_numberOfNat(v___x_3762_);
v___x_3764_ = lean_alloc_ctor(2, 0, 8);
lean_ctor_set_uint64(v___x_3764_, 0, v___x_3763_);
if (v_isShared_3761_ == 0)
{
lean_ctor_set(v___x_3760_, 0, v___x_3764_);
v___x_3766_ = v___x_3760_;
goto v_reusejp_3765_;
}
else
{
lean_object* v_reuseFailAlloc_3768_; 
v_reuseFailAlloc_3768_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3768_, 0, v___x_3764_);
v___x_3766_ = v_reuseFailAlloc_3768_;
goto v_reusejp_3765_;
}
v_reusejp_3765_:
{
lean_object* v___x_3767_; 
v___x_3767_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__4___closed__1, &lp_algalVerification_Algal_Expr_machine___lam__4___closed__1_once, _init_lp_algalVerification_Algal_Expr_machine___lam__4___closed__1);
v_result_3739_ = v___x_3766_;
v_charges_3740_ = v___x_3767_;
goto v___jp_3738_;
}
}
}
}
v___jp_3738_:
{
lean_object* v_charges_3741_; lean_object* v___x_3742_; 
v_charges_3741_ = lean_ctor_get(v___x_3737_, 1);
lean_inc(v_charges_3741_);
lean_dec_ref(v___x_3737_);
lean_inc(v_charges_3740_);
v___x_3742_ = l_List_appendTR___redArg(v_charges_3741_, v_charges_3740_);
v_result_2558_ = v_result_3739_;
v_charges_2559_ = v___x_3742_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_3771_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3771_ = lp_algalVerification_Algal_Expr_machine___lam__22(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3771_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3772_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3772_ = lp_algalVerification_Algal_Expr_machine___lam__22(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3772_;
goto v___jp_2571_;
}
}
}
else
{
lean_object* v___x_3773_; lean_object* v___x_3774_; lean_object* v___x_3775_; lean_object* v___x_3776_; lean_object* v_result_3778_; lean_object* v_charges_3779_; lean_object* v___y_3783_; lean_object* v_result_3786_; 
lean_del_object(v___x_2584_);
lean_dec(v___x_2554_);
lean_dec_ref(v_value_2553_);
lean_del_object(v___x_2519_);
v___x_3773_ = lean_box(0);
v___x_3774_ = lean_unsigned_to_nat(2u);
v___x_3775_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v___x_3775_, 0, v_rest_2552_);
lean_ctor_set(v___x_3775_, 1, v___x_3773_);
lean_ctor_set(v___x_3775_, 2, v___x_3774_);
v___x_3776_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3775_);
v_result_3786_ = lean_ctor_get(v___x_3776_, 0);
lean_inc_ref(v_result_3786_);
if (lean_obj_tag(v_result_3786_) == 0)
{
lean_object* v_charges_3787_; 
v_charges_3787_ = lean_ctor_get(v___x_3776_, 1);
lean_inc(v_charges_3787_);
lean_dec_ref(v___x_3776_);
v_result_2558_ = v_result_3786_;
v_charges_2559_ = v_charges_3787_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_3788_; 
v_a_3788_ = lean_ctor_get(v_result_3786_, 0);
if (lean_obj_tag(v_a_3788_) == 4)
{
lean_object* v_values_3789_; lean_object* v___x_3790_; lean_object* v___x_3791_; uint8_t v___x_3792_; 
v_values_3789_ = lean_ctor_get(v_a_3788_, 0);
v___x_3790_ = lean_unsigned_to_nat(1024u);
v___x_3791_ = lp_algalVerification_Algal_Expr_itemsLength(v_values_3789_);
v___x_3792_ = lean_nat_dec_lt(v___x_3790_, v___x_3791_);
lean_dec(v___x_3791_);
if (v___x_3792_ == 0)
{
lean_object* v___x_3793_; 
v___x_3793_ = lean_box(0);
v_result_3778_ = v_result_3786_;
v_charges_3779_ = v___x_3793_;
goto v___jp_3777_;
}
else
{
lean_object* v___x_3794_; 
lean_dec_ref_known(v_result_3786_, 1);
v___x_3794_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___closed__42, &lp_algalVerification_Algal_Expr_machine___closed__42_once, _init_lp_algalVerification_Algal_Expr_machine___closed__42);
v___y_3783_ = v___x_3794_;
goto v___jp_3782_;
}
}
else
{
lean_object* v___x_3795_; 
lean_dec_ref_known(v_result_3786_, 1);
v___x_3795_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__6___closed__0, &lp_algalVerification_Algal_Expr_machine___lam__6___closed__0_once, _init_lp_algalVerification_Algal_Expr_machine___lam__6___closed__0);
v___y_3783_ = v___x_3795_;
goto v___jp_3782_;
}
}
v___jp_3777_:
{
lean_object* v_charges_3780_; lean_object* v___x_3781_; 
v_charges_3780_ = lean_ctor_get(v___x_3776_, 1);
lean_inc(v_charges_3780_);
lean_dec_ref(v___x_3776_);
lean_inc(v_charges_3779_);
v___x_3781_ = l_List_appendTR___redArg(v_charges_3780_, v_charges_3779_);
v_result_2558_ = v_result_3778_;
v_charges_2559_ = v___x_3781_;
goto v___jp_2557_;
}
v___jp_3782_:
{
lean_object* v_result_3784_; lean_object* v_charges_3785_; 
v_result_3784_ = lean_ctor_get(v___y_3783_, 0);
v_charges_3785_ = lean_ctor_get(v___y_3783_, 1);
lean_inc_ref(v_result_3784_);
v_result_3778_ = v_result_3784_;
v_charges_3779_ = v_charges_3785_;
goto v___jp_3777_;
}
}
}
else
{
lean_del_object(v___x_2584_);
lean_dec(v___x_2554_);
if (lean_obj_tag(v_rest_2552_) == 0)
{
lean_object* v___x_3796_; lean_object* v___x_3797_; lean_object* v___x_3798_; lean_object* v___x_3799_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3796_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__9___closed__0));
v___x_3797_ = lean_unsigned_to_nat(0u);
v___x_3798_ = lp_algalVerification_Algal_Expr_errArity(v_value_2553_, v___x_3796_, v___x_3797_);
v___x_3799_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_3798_);
v___y_2572_ = v___x_3799_;
goto v___jp_2571_;
}
else
{
lean_object* v_value_3800_; lean_object* v_rest_3801_; lean_object* v___x_3803_; 
v_value_3800_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_3800_);
v_rest_3801_ = lean_ctor_get(v_rest_2552_, 1);
lean_inc(v_rest_3801_);
lean_dec_ref_known(v_rest_2552_, 2);
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_3800_);
v___x_3803_ = v___x_2519_;
goto v_reusejp_3802_;
}
else
{
lean_object* v_reuseFailAlloc_3831_; 
v_reuseFailAlloc_3831_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3831_, 0, v_value_3800_);
v___x_3803_ = v_reuseFailAlloc_3831_;
goto v_reusejp_3802_;
}
v_reusejp_3802_:
{
lean_object* v___x_3804_; lean_object* v___y_3806_; lean_object* v_result_3811_; 
lean_inc(v_scope_2515_);
v___x_3804_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3803_);
v_result_3811_ = lean_ctor_get(v___x_3804_, 0);
lean_inc_ref(v_result_3811_);
if (lean_obj_tag(v_result_3811_) == 0)
{
lean_object* v_charges_3812_; 
lean_dec(v_rest_3801_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_charges_3812_ = lean_ctor_get(v___x_3804_, 1);
lean_inc(v_charges_3812_);
lean_dec_ref(v___x_3804_);
v_result_2558_ = v_result_3811_;
v_charges_2559_ = v_charges_3812_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_3813_; 
v_a_3813_ = lean_ctor_get(v_result_3811_, 0);
lean_inc(v_a_3813_);
lean_dec_ref_known(v_result_3811_, 1);
if (lean_obj_tag(v_a_3813_) == 3)
{
lean_object* v_value_3814_; lean_object* v___x_3815_; 
v_value_3814_ = lean_ctor_get(v_a_3813_, 0);
lean_inc_ref(v_value_3814_);
lean_dec_ref_known(v_a_3813_, 1);
v___x_3815_ = lp_algalVerification_Algal_Expr_lookupName(v_env_2514_, v_scope_2515_, v_value_3814_);
if (lean_obj_tag(v___x_3815_) == 0)
{
lean_object* v___x_3816_; lean_object* v___x_3817_; lean_object* v___x_3818_; lean_object* v___x_3819_; lean_object* v___x_3820_; lean_object* v___x_3821_; 
lean_dec(v_rest_3801_);
lean_dec(v_scope_2515_);
v___x_3816_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__44));
v___x_3817_ = lean_string_append(v___x_3816_, v_value_3814_);
lean_dec_ref(v_value_3814_);
v___x_3818_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__45));
v___x_3819_ = lean_string_append(v___x_3817_, v___x_3818_);
v___x_3820_ = lp_algalVerification_Algal_Expr_errPathWhat(v_value_2553_, v___x_3819_);
v___x_3821_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_3820_);
v___y_3806_ = v___x_3821_;
goto v___jp_3805_;
}
else
{
lean_object* v_val_3822_; lean_object* v___x_3823_; lean_object* v___x_3824_; lean_object* v___x_3825_; 
lean_dec_ref(v_value_3814_);
v_val_3822_ = lean_ctor_get(v___x_3815_, 0);
lean_inc(v_val_3822_);
lean_dec_ref_known(v___x_3815_, 1);
v___x_3823_ = lean_unsigned_to_nat(1u);
v___x_3824_ = lean_alloc_ctor(4, 4, 0);
lean_ctor_set(v___x_3824_, 0, v_value_2553_);
lean_ctor_set(v___x_3824_, 1, v_val_3822_);
lean_ctor_set(v___x_3824_, 2, v_rest_3801_);
lean_ctor_set(v___x_3824_, 3, v___x_3823_);
v___x_3825_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3824_);
v___y_3806_ = v___x_3825_;
goto v___jp_3805_;
}
}
else
{
lean_object* v___x_3826_; lean_object* v___x_3827_; lean_object* v___x_3828_; lean_object* v___x_3829_; lean_object* v___x_3830_; 
lean_dec(v_rest_3801_);
lean_dec(v_scope_2515_);
v___x_3826_ = lean_unsigned_to_nat(0u);
v___x_3827_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__46));
v___x_3828_ = lp_algalVerification_Algal_Expr_kindOf(v_a_3813_);
lean_dec(v_a_3813_);
v___x_3829_ = lp_algalVerification_Algal_Expr_errType(v_value_2553_, v___x_3826_, v___x_3827_, v___x_3828_);
v___x_3830_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_3829_);
v___y_3806_ = v___x_3830_;
goto v___jp_3805_;
}
}
v___jp_3805_:
{
lean_object* v_result_3807_; lean_object* v_charges_3808_; lean_object* v_charges_3809_; lean_object* v___x_3810_; 
v_result_3807_ = lean_ctor_get(v___y_3806_, 0);
lean_inc_ref(v_result_3807_);
v_charges_3808_ = lean_ctor_get(v___y_3806_, 1);
lean_inc(v_charges_3808_);
lean_dec_ref(v___y_3806_);
v_charges_3809_ = lean_ctor_get(v___x_3804_, 1);
lean_inc(v_charges_3809_);
lean_dec_ref(v___x_3804_);
v___x_3810_ = l_List_appendTR___redArg(v_charges_3809_, v_charges_3808_);
v_result_2558_ = v_result_3807_;
v_charges_2559_ = v___x_3810_;
goto v___jp_2557_;
}
}
}
}
}
else
{
lean_del_object(v___x_2584_);
if (lean_obj_tag(v_rest_2552_) == 1)
{
lean_object* v_rest_3832_; 
v_rest_3832_ = lean_ctor_get(v_rest_2552_, 1);
if (lean_obj_tag(v_rest_3832_) == 1)
{
lean_object* v_rest_3833_; 
v_rest_3833_ = lean_ctor_get(v_rest_3832_, 1);
lean_inc(v_rest_3833_);
if (lean_obj_tag(v_rest_3833_) == 1)
{
lean_object* v_rest_3834_; 
v_rest_3834_ = lean_ctor_get(v_rest_3833_, 1);
if (lean_obj_tag(v_rest_3834_) == 0)
{
lean_object* v_value_3835_; lean_object* v_value_3836_; lean_object* v_value_3837_; lean_object* v___x_3839_; uint8_t v_isShared_3840_; uint8_t v_isSharedCheck_3872_; 
lean_inc_ref(v_rest_3832_);
lean_dec(v___x_2554_);
lean_dec_ref(v_value_2553_);
v_value_3835_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_3835_);
lean_dec_ref_known(v_rest_2552_, 2);
v_value_3836_ = lean_ctor_get(v_rest_3832_, 0);
lean_inc(v_value_3836_);
lean_dec_ref_known(v_rest_3832_, 2);
v_value_3837_ = lean_ctor_get(v_rest_3833_, 0);
v_isSharedCheck_3872_ = !lean_is_exclusive(v_rest_3833_);
if (v_isSharedCheck_3872_ == 0)
{
lean_object* v_unused_3873_; 
v_unused_3873_ = lean_ctor_get(v_rest_3833_, 1);
lean_dec(v_unused_3873_);
v___x_3839_ = v_rest_3833_;
v_isShared_3840_ = v_isSharedCheck_3872_;
goto v_resetjp_3838_;
}
else
{
lean_inc(v_value_3837_);
lean_dec(v_rest_3833_);
v___x_3839_ = lean_box(0);
v_isShared_3840_ = v_isSharedCheck_3872_;
goto v_resetjp_3838_;
}
v_resetjp_3838_:
{
lean_object* v___x_3842_; 
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_3836_);
v___x_3842_ = v___x_2519_;
goto v_reusejp_3841_;
}
else
{
lean_object* v_reuseFailAlloc_3871_; 
v_reuseFailAlloc_3871_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3871_, 0, v_value_3836_);
v___x_3842_ = v_reuseFailAlloc_3871_;
goto v_reusejp_3841_;
}
v_reusejp_3841_:
{
lean_object* v___x_3843_; lean_object* v_result_3844_; 
lean_inc(v_scope_2515_);
v___x_3843_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3842_);
v_result_3844_ = lean_ctor_get(v___x_3843_, 0);
lean_inc_ref(v_result_3844_);
if (lean_obj_tag(v_result_3844_) == 0)
{
lean_object* v_charges_3845_; 
lean_del_object(v___x_3839_);
lean_dec(v_value_3837_);
lean_dec(v_value_3835_);
lean_dec(v_scope_2515_);
v_charges_3845_ = lean_ctor_get(v___x_3843_, 1);
lean_inc(v_charges_3845_);
lean_dec_ref(v___x_3843_);
v_result_2558_ = v_result_3844_;
v_charges_2559_ = v_charges_3845_;
goto v___jp_2557_;
}
else
{
lean_object* v_charges_3846_; lean_object* v___x_3848_; uint8_t v_isShared_3849_; uint8_t v_isSharedCheck_3869_; 
v_charges_3846_ = lean_ctor_get(v___x_3843_, 1);
v_isSharedCheck_3869_ = !lean_is_exclusive(v___x_3843_);
if (v_isSharedCheck_3869_ == 0)
{
lean_object* v_unused_3870_; 
v_unused_3870_ = lean_ctor_get(v___x_3843_, 0);
lean_dec(v_unused_3870_);
v___x_3848_ = v___x_3843_;
v_isShared_3849_ = v_isSharedCheck_3869_;
goto v_resetjp_3847_;
}
else
{
lean_inc(v_charges_3846_);
lean_dec(v___x_3843_);
v___x_3848_ = lean_box(0);
v_isShared_3849_ = v_isSharedCheck_3869_;
goto v_resetjp_3847_;
}
v_resetjp_3847_:
{
lean_object* v_a_3850_; lean_object* v___x_3852_; uint8_t v_isShared_3853_; uint8_t v_isSharedCheck_3868_; 
v_a_3850_ = lean_ctor_get(v_result_3844_, 0);
v_isSharedCheck_3868_ = !lean_is_exclusive(v_result_3844_);
if (v_isSharedCheck_3868_ == 0)
{
v___x_3852_ = v_result_3844_;
v_isShared_3853_ = v_isSharedCheck_3868_;
goto v_resetjp_3851_;
}
else
{
lean_inc(v_a_3850_);
lean_dec(v_result_3844_);
v___x_3852_ = lean_box(0);
v_isShared_3853_ = v_isSharedCheck_3868_;
goto v_resetjp_3851_;
}
v_resetjp_3851_:
{
lean_object* v___x_3854_; lean_object* v___x_3856_; 
v___x_3854_ = lp_algalVerification_Algal_Expr_binderName(v_value_3835_);
lean_dec(v_value_3835_);
if (v_isShared_3849_ == 0)
{
lean_ctor_set(v___x_3848_, 1, v_a_3850_);
lean_ctor_set(v___x_3848_, 0, v___x_3854_);
v___x_3856_ = v___x_3848_;
goto v_reusejp_3855_;
}
else
{
lean_object* v_reuseFailAlloc_3867_; 
v_reuseFailAlloc_3867_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_3867_, 0, v___x_3854_);
lean_ctor_set(v_reuseFailAlloc_3867_, 1, v_a_3850_);
v___x_3856_ = v_reuseFailAlloc_3867_;
goto v_reusejp_3855_;
}
v_reusejp_3855_:
{
lean_object* v___x_3858_; 
if (v_isShared_3840_ == 0)
{
lean_ctor_set(v___x_3839_, 1, v_scope_2515_);
lean_ctor_set(v___x_3839_, 0, v___x_3856_);
v___x_3858_ = v___x_3839_;
goto v_reusejp_3857_;
}
else
{
lean_object* v_reuseFailAlloc_3866_; 
v_reuseFailAlloc_3866_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_3866_, 0, v___x_3856_);
lean_ctor_set(v_reuseFailAlloc_3866_, 1, v_scope_2515_);
v___x_3858_ = v_reuseFailAlloc_3866_;
goto v_reusejp_3857_;
}
v_reusejp_3857_:
{
lean_object* v___x_3860_; 
if (v_isShared_3853_ == 0)
{
lean_ctor_set_tag(v___x_3852_, 0);
lean_ctor_set(v___x_3852_, 0, v_value_3837_);
v___x_3860_ = v___x_3852_;
goto v_reusejp_3859_;
}
else
{
lean_object* v_reuseFailAlloc_3865_; 
v_reuseFailAlloc_3865_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3865_, 0, v_value_3837_);
v___x_3860_ = v_reuseFailAlloc_3865_;
goto v_reusejp_3859_;
}
v_reusejp_3859_:
{
lean_object* v___x_3861_; lean_object* v_result_3862_; lean_object* v_charges_3863_; lean_object* v___x_3864_; 
v___x_3861_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v___x_3858_, v___x_3860_);
v_result_3862_ = lean_ctor_get(v___x_3861_, 0);
lean_inc_ref(v_result_3862_);
v_charges_3863_ = lean_ctor_get(v___x_3861_, 1);
lean_inc(v_charges_3863_);
lean_dec_ref(v___x_3861_);
v___x_3864_ = l_List_appendTR___redArg(v_charges_3846_, v_charges_3863_);
v_result_2558_ = v_result_3862_;
v_charges_2559_ = v___x_3864_;
goto v___jp_2557_;
}
}
}
}
}
}
}
}
}
else
{
lean_object* v___x_3874_; 
lean_dec_ref_known(v_rest_3833_, 2);
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3874_ = lp_algalVerification_Algal_Expr_machine___lam__21(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3874_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3875_; 
lean_dec(v_rest_3833_);
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3875_ = lp_algalVerification_Algal_Expr_machine___lam__21(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3875_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3876_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3876_ = lp_algalVerification_Algal_Expr_machine___lam__21(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3876_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3877_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3877_ = lp_algalVerification_Algal_Expr_machine___lam__21(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3877_;
goto v___jp_2571_;
}
}
}
else
{
lean_del_object(v___x_2584_);
if (lean_obj_tag(v_rest_2552_) == 1)
{
lean_object* v_rest_3878_; 
v_rest_3878_ = lean_ctor_get(v_rest_2552_, 1);
if (lean_obj_tag(v_rest_3878_) == 1)
{
lean_object* v_rest_3879_; 
v_rest_3879_ = lean_ctor_get(v_rest_3878_, 1);
if (lean_obj_tag(v_rest_3879_) == 1)
{
lean_object* v_rest_3880_; 
v_rest_3880_ = lean_ctor_get(v_rest_3879_, 1);
if (lean_obj_tag(v_rest_3880_) == 0)
{
lean_object* v_value_3881_; lean_object* v_value_3882_; lean_object* v_value_3883_; lean_object* v___x_3885_; 
lean_inc_ref(v_rest_3879_);
lean_inc_ref(v_rest_3878_);
lean_dec(v___x_2554_);
v_value_3881_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_3881_);
lean_dec_ref_known(v_rest_2552_, 2);
v_value_3882_ = lean_ctor_get(v_rest_3878_, 0);
lean_inc(v_value_3882_);
lean_dec_ref_known(v_rest_3878_, 2);
v_value_3883_ = lean_ctor_get(v_rest_3879_, 0);
lean_inc(v_value_3883_);
lean_dec_ref_known(v_rest_3879_, 2);
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_3881_);
v___x_3885_ = v___x_2519_;
goto v_reusejp_3884_;
}
else
{
lean_object* v_reuseFailAlloc_3927_; 
v_reuseFailAlloc_3927_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3927_, 0, v_value_3881_);
v___x_3885_ = v_reuseFailAlloc_3927_;
goto v_reusejp_3884_;
}
v_reusejp_3884_:
{
lean_object* v___x_3886_; lean_object* v_result_3888_; lean_object* v_charges_3889_; lean_object* v_result_3892_; 
lean_inc(v_scope_2515_);
v___x_3886_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3885_);
v_result_3892_ = lean_ctor_get(v___x_3886_, 0);
lean_inc_ref(v_result_3892_);
if (lean_obj_tag(v_result_3892_) == 0)
{
lean_object* v_charges_3893_; 
lean_dec(v_value_3883_);
lean_dec(v_value_3882_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_charges_3893_ = lean_ctor_get(v___x_3886_, 1);
lean_inc(v_charges_3893_);
lean_dec_ref(v___x_3886_);
v_result_2558_ = v_result_3892_;
v_charges_2559_ = v_charges_3893_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_3894_; lean_object* v___x_3896_; uint8_t v_isShared_3897_; uint8_t v_isSharedCheck_3926_; 
v_a_3894_ = lean_ctor_get(v_result_3892_, 0);
v_isSharedCheck_3926_ = !lean_is_exclusive(v_result_3892_);
if (v_isSharedCheck_3926_ == 0)
{
v___x_3896_ = v_result_3892_;
v_isShared_3897_ = v_isSharedCheck_3926_;
goto v_resetjp_3895_;
}
else
{
lean_inc(v_a_3894_);
lean_dec(v_result_3892_);
v___x_3896_ = lean_box(0);
v_isShared_3897_ = v_isSharedCheck_3926_;
goto v_resetjp_3895_;
}
v_resetjp_3895_:
{
lean_object* v___x_3898_; lean_object* v___x_3899_; lean_object* v___y_3901_; lean_object* v_result_3906_; lean_object* v___x_3907_; 
v___x_3898_ = lean_unsigned_to_nat(0u);
v___x_3899_ = lp_algalVerification_Algal_Expr_asBool(v_value_2553_, v___x_3898_, v_a_3894_);
lean_dec(v_a_3894_);
v_result_3906_ = lean_ctor_get(v___x_3899_, 0);
lean_inc_ref(v_result_3906_);
lean_dec_ref(v___x_3899_);
v___x_3907_ = lean_box(0);
if (lean_obj_tag(v_result_3906_) == 0)
{
lean_object* v_a_3908_; lean_object* v___x_3910_; uint8_t v_isShared_3911_; uint8_t v_isSharedCheck_3915_; 
lean_del_object(v___x_3896_);
lean_dec(v_value_3883_);
lean_dec(v_value_3882_);
lean_dec(v_scope_2515_);
v_a_3908_ = lean_ctor_get(v_result_3906_, 0);
v_isSharedCheck_3915_ = !lean_is_exclusive(v_result_3906_);
if (v_isSharedCheck_3915_ == 0)
{
v___x_3910_ = v_result_3906_;
v_isShared_3911_ = v_isSharedCheck_3915_;
goto v_resetjp_3909_;
}
else
{
lean_inc(v_a_3908_);
lean_dec(v_result_3906_);
v___x_3910_ = lean_box(0);
v_isShared_3911_ = v_isSharedCheck_3915_;
goto v_resetjp_3909_;
}
v_resetjp_3909_:
{
lean_object* v___x_3913_; 
if (v_isShared_3911_ == 0)
{
v___x_3913_ = v___x_3910_;
goto v_reusejp_3912_;
}
else
{
lean_object* v_reuseFailAlloc_3914_; 
v_reuseFailAlloc_3914_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3914_, 0, v_a_3908_);
v___x_3913_ = v_reuseFailAlloc_3914_;
goto v_reusejp_3912_;
}
v_reusejp_3912_:
{
v_result_3888_ = v___x_3913_;
v_charges_3889_ = v___x_3907_;
goto v___jp_3887_;
}
}
}
else
{
lean_object* v_a_3916_; uint8_t v___x_3917_; 
v_a_3916_ = lean_ctor_get(v_result_3906_, 0);
lean_inc(v_a_3916_);
lean_dec_ref_known(v_result_3906_, 1);
v___x_3917_ = lean_unbox(v_a_3916_);
lean_dec(v_a_3916_);
if (v___x_3917_ == 0)
{
lean_object* v___x_3919_; 
lean_dec(v_value_3882_);
if (v_isShared_3897_ == 0)
{
lean_ctor_set_tag(v___x_3896_, 0);
lean_ctor_set(v___x_3896_, 0, v_value_3883_);
v___x_3919_ = v___x_3896_;
goto v_reusejp_3918_;
}
else
{
lean_object* v_reuseFailAlloc_3921_; 
v_reuseFailAlloc_3921_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3921_, 0, v_value_3883_);
v___x_3919_ = v_reuseFailAlloc_3921_;
goto v_reusejp_3918_;
}
v_reusejp_3918_:
{
lean_object* v___x_3920_; 
v___x_3920_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3919_);
v___y_3901_ = v___x_3920_;
goto v___jp_3900_;
}
}
else
{
lean_object* v___x_3923_; 
lean_dec(v_value_3883_);
if (v_isShared_3897_ == 0)
{
lean_ctor_set_tag(v___x_3896_, 0);
lean_ctor_set(v___x_3896_, 0, v_value_3882_);
v___x_3923_ = v___x_3896_;
goto v_reusejp_3922_;
}
else
{
lean_object* v_reuseFailAlloc_3925_; 
v_reuseFailAlloc_3925_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3925_, 0, v_value_3882_);
v___x_3923_ = v_reuseFailAlloc_3925_;
goto v_reusejp_3922_;
}
v_reusejp_3922_:
{
lean_object* v___x_3924_; 
v___x_3924_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3923_);
v___y_3901_ = v___x_3924_;
goto v___jp_3900_;
}
}
}
v___jp_3900_:
{
lean_object* v_result_3902_; lean_object* v_charges_3903_; lean_object* v___x_3904_; lean_object* v___x_3905_; 
v_result_3902_ = lean_ctor_get(v___y_3901_, 0);
lean_inc_ref(v_result_3902_);
v_charges_3903_ = lean_ctor_get(v___y_3901_, 1);
lean_inc(v_charges_3903_);
lean_dec_ref(v___y_3901_);
v___x_3904_ = lean_box(0);
v___x_3905_ = l_List_appendTR___redArg(v___x_3904_, v_charges_3903_);
v_result_3888_ = v_result_3902_;
v_charges_3889_ = v___x_3905_;
goto v___jp_3887_;
}
}
}
v___jp_3887_:
{
lean_object* v_charges_3890_; lean_object* v___x_3891_; 
v_charges_3890_ = lean_ctor_get(v___x_3886_, 1);
lean_inc(v_charges_3890_);
lean_dec_ref(v___x_3886_);
v___x_3891_ = l_List_appendTR___redArg(v_charges_3890_, v_charges_3889_);
v_result_2558_ = v_result_3888_;
v_charges_2559_ = v___x_3891_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_3928_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3928_ = lp_algalVerification_Algal_Expr_machine___lam__21(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3928_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3929_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3929_ = lp_algalVerification_Algal_Expr_machine___lam__21(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3929_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3930_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3930_ = lp_algalVerification_Algal_Expr_machine___lam__21(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3930_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3931_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3931_ = lp_algalVerification_Algal_Expr_machine___lam__21(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3931_;
goto v___jp_2571_;
}
}
}
else
{
lean_del_object(v___x_2584_);
if (lean_obj_tag(v_rest_2552_) == 1)
{
lean_object* v_rest_3932_; 
v_rest_3932_ = lean_ctor_get(v_rest_2552_, 1);
if (lean_obj_tag(v_rest_3932_) == 0)
{
lean_object* v_value_3933_; lean_object* v___x_3935_; 
lean_dec(v___x_2554_);
v_value_3933_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_3933_);
lean_dec_ref_known(v_rest_2552_, 2);
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_3933_);
v___x_3935_ = v___x_2519_;
goto v_reusejp_3934_;
}
else
{
lean_object* v_reuseFailAlloc_3970_; 
v_reuseFailAlloc_3970_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3970_, 0, v_value_3933_);
v___x_3935_ = v_reuseFailAlloc_3970_;
goto v_reusejp_3934_;
}
v_reusejp_3934_:
{
lean_object* v___x_3936_; lean_object* v_result_3938_; lean_object* v_charges_3939_; lean_object* v_result_3942_; 
v___x_3936_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3935_);
v_result_3942_ = lean_ctor_get(v___x_3936_, 0);
lean_inc_ref(v_result_3942_);
if (lean_obj_tag(v_result_3942_) == 0)
{
lean_object* v_charges_3943_; 
lean_dec_ref(v_value_2553_);
v_charges_3943_ = lean_ctor_get(v___x_3936_, 1);
lean_inc(v_charges_3943_);
lean_dec_ref(v___x_3936_);
v_result_2558_ = v_result_3942_;
v_charges_2559_ = v_charges_3943_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_3944_; lean_object* v___x_3946_; uint8_t v_isShared_3947_; uint8_t v_isSharedCheck_3969_; 
v_a_3944_ = lean_ctor_get(v_result_3942_, 0);
v_isSharedCheck_3969_ = !lean_is_exclusive(v_result_3942_);
if (v_isSharedCheck_3969_ == 0)
{
v___x_3946_ = v_result_3942_;
v_isShared_3947_ = v_isSharedCheck_3969_;
goto v_resetjp_3945_;
}
else
{
lean_inc(v_a_3944_);
lean_dec(v_result_3942_);
v___x_3946_ = lean_box(0);
v_isShared_3947_ = v_isSharedCheck_3969_;
goto v_resetjp_3945_;
}
v_resetjp_3945_:
{
lean_object* v___x_3948_; lean_object* v___x_3949_; uint8_t v___y_3951_; lean_object* v_result_3957_; lean_object* v___x_3958_; 
v___x_3948_ = lean_unsigned_to_nat(0u);
v___x_3949_ = lp_algalVerification_Algal_Expr_asBool(v_value_2553_, v___x_3948_, v_a_3944_);
lean_dec(v_a_3944_);
v_result_3957_ = lean_ctor_get(v___x_3949_, 0);
lean_inc_ref(v_result_3957_);
lean_dec_ref(v___x_3949_);
v___x_3958_ = lean_box(0);
if (lean_obj_tag(v_result_3957_) == 0)
{
lean_object* v_a_3959_; lean_object* v___x_3961_; uint8_t v_isShared_3962_; uint8_t v_isSharedCheck_3966_; 
lean_del_object(v___x_3946_);
v_a_3959_ = lean_ctor_get(v_result_3957_, 0);
v_isSharedCheck_3966_ = !lean_is_exclusive(v_result_3957_);
if (v_isSharedCheck_3966_ == 0)
{
v___x_3961_ = v_result_3957_;
v_isShared_3962_ = v_isSharedCheck_3966_;
goto v_resetjp_3960_;
}
else
{
lean_inc(v_a_3959_);
lean_dec(v_result_3957_);
v___x_3961_ = lean_box(0);
v_isShared_3962_ = v_isSharedCheck_3966_;
goto v_resetjp_3960_;
}
v_resetjp_3960_:
{
lean_object* v___x_3964_; 
if (v_isShared_3962_ == 0)
{
v___x_3964_ = v___x_3961_;
goto v_reusejp_3963_;
}
else
{
lean_object* v_reuseFailAlloc_3965_; 
v_reuseFailAlloc_3965_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3965_, 0, v_a_3959_);
v___x_3964_ = v_reuseFailAlloc_3965_;
goto v_reusejp_3963_;
}
v_reusejp_3963_:
{
v_result_3938_ = v___x_3964_;
v_charges_3939_ = v___x_3958_;
goto v___jp_3937_;
}
}
}
else
{
lean_object* v_a_3967_; uint8_t v___x_3968_; 
v_a_3967_ = lean_ctor_get(v_result_3957_, 0);
lean_inc(v_a_3967_);
lean_dec_ref_known(v_result_3957_, 1);
v___x_3968_ = lean_unbox(v_a_3967_);
lean_dec(v_a_3967_);
if (v___x_3968_ == 0)
{
v___y_3951_ = v___x_2620_;
goto v___jp_3950_;
}
else
{
v___y_3951_ = v___x_2618_;
goto v___jp_3950_;
}
}
v___jp_3950_:
{
lean_object* v___x_3952_; lean_object* v___x_3954_; 
v___x_3952_ = lean_alloc_ctor(1, 0, 1);
lean_ctor_set_uint8(v___x_3952_, 0, v___y_3951_);
if (v_isShared_3947_ == 0)
{
lean_ctor_set(v___x_3946_, 0, v___x_3952_);
v___x_3954_ = v___x_3946_;
goto v_reusejp_3953_;
}
else
{
lean_object* v_reuseFailAlloc_3956_; 
v_reuseFailAlloc_3956_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3956_, 0, v___x_3952_);
v___x_3954_ = v_reuseFailAlloc_3956_;
goto v_reusejp_3953_;
}
v_reusejp_3953_:
{
lean_object* v___x_3955_; 
v___x_3955_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__4___closed__1, &lp_algalVerification_Algal_Expr_machine___lam__4___closed__1_once, _init_lp_algalVerification_Algal_Expr_machine___lam__4___closed__1);
v_result_3938_ = v___x_3954_;
v_charges_3939_ = v___x_3955_;
goto v___jp_3937_;
}
}
}
}
v___jp_3937_:
{
lean_object* v_charges_3940_; lean_object* v___x_3941_; 
v_charges_3940_ = lean_ctor_get(v___x_3936_, 1);
lean_inc(v_charges_3940_);
lean_dec_ref(v___x_3936_);
lean_inc(v_charges_3939_);
v___x_3941_ = l_List_appendTR___redArg(v_charges_3940_, v_charges_3939_);
v_result_2558_ = v_result_3938_;
v_charges_2559_ = v___x_3941_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_3971_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3971_ = lp_algalVerification_Algal_Expr_machine___lam__22(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_3971_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3972_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_3972_ = lp_algalVerification_Algal_Expr_machine___lam__22(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_3972_;
goto v___jp_2571_;
}
}
}
else
{
lean_object* v___x_3973_; lean_object* v___x_3974_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
v___x_3973_ = lean_box(0);
v___x_3974_ = lp_algalVerification_Algal_Expr_machine___lam__9(v___x_2554_, v_value_2553_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_3973_);
lean_dec(v___x_2554_);
v___y_2572_ = v___x_3974_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3975_; lean_object* v___x_3976_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
v___x_3975_ = lean_box(0);
v___x_3976_ = lp_algalVerification_Algal_Expr_machine___lam__9(v___x_2554_, v_value_2553_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_3975_);
lean_dec(v___x_2554_);
v___y_2572_ = v___x_3976_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3977_; lean_object* v___x_3978_; 
lean_del_object(v___x_2584_);
lean_dec(v___x_2554_);
lean_del_object(v___x_2519_);
v___x_3977_ = lean_box(0);
v___x_3978_ = lp_algalVerification_Algal_Expr_machine___lam__10(v_value_2553_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___f_2602_, v___x_3977_);
v___y_2572_ = v___x_3978_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3979_; lean_object* v___x_3980_; 
lean_del_object(v___x_2584_);
lean_dec(v___x_2554_);
lean_del_object(v___x_2519_);
v___x_3979_ = lean_box(0);
v___x_3980_ = lp_algalVerification_Algal_Expr_machine___lam__10(v_value_2553_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___f_2602_, v___x_3979_);
v___y_2572_ = v___x_3980_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3981_; lean_object* v___x_3982_; 
lean_del_object(v___x_2584_);
lean_dec(v___x_2554_);
lean_del_object(v___x_2519_);
v___x_3981_ = lean_box(0);
v___x_3982_ = lp_algalVerification_Algal_Expr_machine___lam__8(v_value_2553_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___f_2602_, v___x_3981_);
v___y_2572_ = v___x_3982_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3983_; lean_object* v___x_3984_; 
lean_del_object(v___x_2584_);
lean_dec(v___x_2554_);
lean_del_object(v___x_2519_);
v___x_3983_ = lean_box(0);
v___x_3984_ = lp_algalVerification_Algal_Expr_machine___lam__8(v_value_2553_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___f_2602_, v___x_3983_);
v___y_2572_ = v___x_3984_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3985_; lean_object* v___x_3986_; 
lean_del_object(v___x_2584_);
lean_dec(v___x_2554_);
lean_del_object(v___x_2519_);
v___x_3985_ = lean_box(0);
v___x_3986_ = lp_algalVerification_Algal_Expr_machine___lam__8(v_value_2553_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___f_2602_, v___x_3985_);
v___y_2572_ = v___x_3986_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_3987_; lean_object* v___x_3988_; 
lean_del_object(v___x_2584_);
lean_dec(v___x_2554_);
lean_del_object(v___x_2519_);
v___x_3987_ = lean_box(0);
v___x_3988_ = lp_algalVerification_Algal_Expr_machine___lam__8(v_value_2553_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___f_2602_, v___x_3987_);
v___y_2572_ = v___x_3988_;
goto v___jp_2571_;
}
}
else
{
lean_del_object(v___x_2584_);
if (lean_obj_tag(v_rest_2552_) == 1)
{
lean_object* v_rest_3989_; 
v_rest_3989_ = lean_ctor_get(v_rest_2552_, 1);
if (lean_obj_tag(v_rest_3989_) == 1)
{
lean_object* v_rest_3990_; 
v_rest_3990_ = lean_ctor_get(v_rest_3989_, 1);
if (lean_obj_tag(v_rest_3990_) == 1)
{
lean_object* v_rest_3991_; 
v_rest_3991_ = lean_ctor_get(v_rest_3990_, 1);
if (lean_obj_tag(v_rest_3991_) == 0)
{
lean_object* v_value_3992_; lean_object* v_value_3993_; lean_object* v_value_3994_; lean_object* v___x_3996_; 
lean_inc_ref(v_rest_3990_);
lean_inc_ref(v_rest_3989_);
lean_dec(v___x_2554_);
v_value_3992_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_3992_);
lean_dec_ref_known(v_rest_2552_, 2);
v_value_3993_ = lean_ctor_get(v_rest_3989_, 0);
lean_inc(v_value_3993_);
lean_dec_ref_known(v_rest_3989_, 2);
v_value_3994_ = lean_ctor_get(v_rest_3990_, 0);
lean_inc(v_value_3994_);
lean_dec_ref_known(v_rest_3990_, 2);
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_3992_);
v___x_3996_ = v___x_2519_;
goto v_reusejp_3995_;
}
else
{
lean_object* v_reuseFailAlloc_4101_; 
v_reuseFailAlloc_4101_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4101_, 0, v_value_3992_);
v___x_3996_ = v_reuseFailAlloc_4101_;
goto v_reusejp_3995_;
}
v_reusejp_3995_:
{
lean_object* v___x_3997_; lean_object* v_result_3999_; lean_object* v_charges_4000_; lean_object* v_result_4003_; 
lean_inc(v_scope_2515_);
v___x_3997_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_3996_);
v_result_4003_ = lean_ctor_get(v___x_3997_, 0);
lean_inc_ref(v_result_4003_);
if (lean_obj_tag(v_result_4003_) == 0)
{
lean_object* v_charges_4004_; 
lean_dec(v_value_3994_);
lean_dec(v_value_3993_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_charges_4004_ = lean_ctor_get(v___x_3997_, 1);
lean_inc(v_charges_4004_);
lean_dec_ref(v___x_3997_);
v_result_2558_ = v_result_4003_;
v_charges_2559_ = v_charges_4004_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_4005_; lean_object* v___x_4007_; uint8_t v_isShared_4008_; uint8_t v_isSharedCheck_4100_; 
v_a_4005_ = lean_ctor_get(v_result_4003_, 0);
v_isSharedCheck_4100_ = !lean_is_exclusive(v_result_4003_);
if (v_isSharedCheck_4100_ == 0)
{
v___x_4007_ = v_result_4003_;
v_isShared_4008_ = v_isSharedCheck_4100_;
goto v_resetjp_4006_;
}
else
{
lean_inc(v_a_4005_);
lean_dec(v_result_4003_);
v___x_4007_ = lean_box(0);
v_isShared_4008_ = v_isSharedCheck_4100_;
goto v_resetjp_4006_;
}
v_resetjp_4006_:
{
lean_object* v___x_4009_; lean_object* v___x_4010_; lean_object* v_result_4012_; lean_object* v_charges_4013_; lean_object* v_result_4016_; lean_object* v___x_4017_; 
v___x_4009_ = lean_unsigned_to_nat(0u);
lean_inc_ref(v_value_2553_);
v___x_4010_ = lp_algalVerification_Algal_Expr_asNum(v_value_2553_, v___x_4009_, v_a_4005_);
lean_dec(v_a_4005_);
v_result_4016_ = lean_ctor_get(v___x_4010_, 0);
lean_inc_ref(v_result_4016_);
lean_dec_ref(v___x_4010_);
v___x_4017_ = lean_box(0);
if (lean_obj_tag(v_result_4016_) == 0)
{
lean_object* v_a_4018_; lean_object* v___x_4020_; uint8_t v_isShared_4021_; uint8_t v_isSharedCheck_4025_; 
lean_del_object(v___x_4007_);
lean_dec(v_value_3994_);
lean_dec(v_value_3993_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_a_4018_ = lean_ctor_get(v_result_4016_, 0);
v_isSharedCheck_4025_ = !lean_is_exclusive(v_result_4016_);
if (v_isSharedCheck_4025_ == 0)
{
v___x_4020_ = v_result_4016_;
v_isShared_4021_ = v_isSharedCheck_4025_;
goto v_resetjp_4019_;
}
else
{
lean_inc(v_a_4018_);
lean_dec(v_result_4016_);
v___x_4020_ = lean_box(0);
v_isShared_4021_ = v_isSharedCheck_4025_;
goto v_resetjp_4019_;
}
v_resetjp_4019_:
{
lean_object* v___x_4023_; 
if (v_isShared_4021_ == 0)
{
v___x_4023_ = v___x_4020_;
goto v_reusejp_4022_;
}
else
{
lean_object* v_reuseFailAlloc_4024_; 
v_reuseFailAlloc_4024_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4024_, 0, v_a_4018_);
v___x_4023_ = v_reuseFailAlloc_4024_;
goto v_reusejp_4022_;
}
v_reusejp_4022_:
{
v_result_3999_ = v___x_4023_;
v_charges_4000_ = v___x_4017_;
goto v___jp_3998_;
}
}
}
else
{
lean_object* v_a_4026_; lean_object* v___x_4028_; 
v_a_4026_ = lean_ctor_get(v_result_4016_, 0);
lean_inc(v_a_4026_);
lean_dec_ref_known(v_result_4016_, 1);
if (v_isShared_4008_ == 0)
{
lean_ctor_set_tag(v___x_4007_, 0);
lean_ctor_set(v___x_4007_, 0, v_value_3993_);
v___x_4028_ = v___x_4007_;
goto v_reusejp_4027_;
}
else
{
lean_object* v_reuseFailAlloc_4099_; 
v_reuseFailAlloc_4099_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4099_, 0, v_value_3993_);
v___x_4028_ = v_reuseFailAlloc_4099_;
goto v_reusejp_4027_;
}
v_reusejp_4027_:
{
lean_object* v___x_4029_; lean_object* v_result_4031_; lean_object* v_charges_4032_; lean_object* v_result_4035_; 
lean_inc(v_scope_2515_);
v___x_4029_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_4028_);
v_result_4035_ = lean_ctor_get(v___x_4029_, 0);
lean_inc_ref(v_result_4035_);
if (lean_obj_tag(v_result_4035_) == 0)
{
lean_object* v_charges_4036_; 
lean_dec(v_a_4026_);
lean_dec(v_value_3994_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_charges_4036_ = lean_ctor_get(v___x_4029_, 1);
lean_inc(v_charges_4036_);
lean_dec_ref(v___x_4029_);
v_result_4012_ = v_result_4035_;
v_charges_4013_ = v_charges_4036_;
goto v___jp_4011_;
}
else
{
lean_object* v_a_4037_; lean_object* v___x_4039_; uint8_t v_isShared_4040_; uint8_t v_isSharedCheck_4098_; 
v_a_4037_ = lean_ctor_get(v_result_4035_, 0);
v_isSharedCheck_4098_ = !lean_is_exclusive(v_result_4035_);
if (v_isSharedCheck_4098_ == 0)
{
v___x_4039_ = v_result_4035_;
v_isShared_4040_ = v_isSharedCheck_4098_;
goto v_resetjp_4038_;
}
else
{
lean_inc(v_a_4037_);
lean_dec(v_result_4035_);
v___x_4039_ = lean_box(0);
v_isShared_4040_ = v_isSharedCheck_4098_;
goto v_resetjp_4038_;
}
v_resetjp_4038_:
{
lean_object* v___x_4041_; lean_object* v___x_4042_; lean_object* v_result_4044_; lean_object* v_charges_4045_; lean_object* v_result_4047_; 
v___x_4041_ = lean_unsigned_to_nat(1u);
lean_inc_ref(v_value_2553_);
v___x_4042_ = lp_algalVerification_Algal_Expr_asNum(v_value_2553_, v___x_4041_, v_a_4037_);
lean_dec(v_a_4037_);
v_result_4047_ = lean_ctor_get(v___x_4042_, 0);
lean_inc_ref(v_result_4047_);
lean_dec_ref(v___x_4042_);
if (lean_obj_tag(v_result_4047_) == 0)
{
lean_object* v_a_4048_; lean_object* v___x_4050_; uint8_t v_isShared_4051_; uint8_t v_isSharedCheck_4055_; 
lean_del_object(v___x_4039_);
lean_dec(v_a_4026_);
lean_dec(v_value_3994_);
lean_dec_ref(v_value_2553_);
lean_dec(v_scope_2515_);
v_a_4048_ = lean_ctor_get(v_result_4047_, 0);
v_isSharedCheck_4055_ = !lean_is_exclusive(v_result_4047_);
if (v_isSharedCheck_4055_ == 0)
{
v___x_4050_ = v_result_4047_;
v_isShared_4051_ = v_isSharedCheck_4055_;
goto v_resetjp_4049_;
}
else
{
lean_inc(v_a_4048_);
lean_dec(v_result_4047_);
v___x_4050_ = lean_box(0);
v_isShared_4051_ = v_isSharedCheck_4055_;
goto v_resetjp_4049_;
}
v_resetjp_4049_:
{
lean_object* v___x_4053_; 
if (v_isShared_4051_ == 0)
{
v___x_4053_ = v___x_4050_;
goto v_reusejp_4052_;
}
else
{
lean_object* v_reuseFailAlloc_4054_; 
v_reuseFailAlloc_4054_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4054_, 0, v_a_4048_);
v___x_4053_ = v_reuseFailAlloc_4054_;
goto v_reusejp_4052_;
}
v_reusejp_4052_:
{
v_result_4031_ = v___x_4053_;
v_charges_4032_ = v___x_4017_;
goto v___jp_4030_;
}
}
}
else
{
lean_object* v_a_4056_; lean_object* v___x_4058_; 
v_a_4056_ = lean_ctor_get(v_result_4047_, 0);
lean_inc(v_a_4056_);
lean_dec_ref_known(v_result_4047_, 1);
if (v_isShared_4040_ == 0)
{
lean_ctor_set_tag(v___x_4039_, 0);
lean_ctor_set(v___x_4039_, 0, v_value_3994_);
v___x_4058_ = v___x_4039_;
goto v_reusejp_4057_;
}
else
{
lean_object* v_reuseFailAlloc_4097_; 
v_reuseFailAlloc_4097_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4097_, 0, v_value_3994_);
v___x_4058_ = v_reuseFailAlloc_4097_;
goto v_reusejp_4057_;
}
v_reusejp_4057_:
{
lean_object* v___x_4059_; lean_object* v_result_4061_; lean_object* v_charges_4062_; lean_object* v_result_4065_; 
v___x_4059_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_4058_);
v_result_4065_ = lean_ctor_get(v___x_4059_, 0);
lean_inc_ref(v_result_4065_);
if (lean_obj_tag(v_result_4065_) == 0)
{
lean_object* v_charges_4066_; 
lean_dec(v_a_4056_);
lean_dec(v_a_4026_);
lean_dec_ref(v_value_2553_);
v_charges_4066_ = lean_ctor_get(v___x_4059_, 1);
lean_inc(v_charges_4066_);
lean_dec_ref(v___x_4059_);
v_result_4044_ = v_result_4065_;
v_charges_4045_ = v_charges_4066_;
goto v___jp_4043_;
}
else
{
lean_object* v_a_4067_; lean_object* v___x_4068_; lean_object* v___x_4069_; lean_object* v___y_4071_; lean_object* v_result_4075_; 
v_a_4067_ = lean_ctor_get(v_result_4065_, 0);
lean_inc(v_a_4067_);
lean_dec_ref_known(v_result_4065_, 1);
v___x_4068_ = lean_unsigned_to_nat(2u);
lean_inc_ref(v_value_2553_);
v___x_4069_ = lp_algalVerification_Algal_Expr_asNum(v_value_2553_, v___x_4068_, v_a_4067_);
lean_dec(v_a_4067_);
v_result_4075_ = lean_ctor_get(v___x_4069_, 0);
lean_inc_ref(v_result_4075_);
lean_dec_ref(v___x_4069_);
if (lean_obj_tag(v_result_4075_) == 0)
{
lean_object* v_a_4076_; lean_object* v___x_4078_; uint8_t v_isShared_4079_; uint8_t v_isSharedCheck_4083_; 
lean_dec(v_a_4056_);
lean_dec(v_a_4026_);
lean_dec_ref(v_value_2553_);
v_a_4076_ = lean_ctor_get(v_result_4075_, 0);
v_isSharedCheck_4083_ = !lean_is_exclusive(v_result_4075_);
if (v_isSharedCheck_4083_ == 0)
{
v___x_4078_ = v_result_4075_;
v_isShared_4079_ = v_isSharedCheck_4083_;
goto v_resetjp_4077_;
}
else
{
lean_inc(v_a_4076_);
lean_dec(v_result_4075_);
v___x_4078_ = lean_box(0);
v_isShared_4079_ = v_isSharedCheck_4083_;
goto v_resetjp_4077_;
}
v_resetjp_4077_:
{
lean_object* v___x_4081_; 
if (v_isShared_4079_ == 0)
{
v___x_4081_ = v___x_4078_;
goto v_reusejp_4080_;
}
else
{
lean_object* v_reuseFailAlloc_4082_; 
v_reuseFailAlloc_4082_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4082_, 0, v_a_4076_);
v___x_4081_ = v_reuseFailAlloc_4082_;
goto v_reusejp_4080_;
}
v_reusejp_4080_:
{
v_result_4061_ = v___x_4081_;
v_charges_4062_ = v___x_4017_;
goto v___jp_4060_;
}
}
}
else
{
lean_object* v_a_4084_; double v___x_4085_; double v___x_4086_; uint8_t v___x_4087_; 
v_a_4084_ = lean_ctor_get(v_result_4075_, 0);
lean_inc(v_a_4084_);
lean_dec_ref_known(v_result_4075_, 1);
v___x_4085_ = lean_unbox_float(v_a_4084_);
v___x_4086_ = lean_unbox_float(v_a_4056_);
v___x_4087_ = lean_float_decLt(v___x_4085_, v___x_4086_);
if (v___x_4087_ == 0)
{
double v___x_4088_; double v___x_4089_; double v___x_4090_; double v___x_4091_; double v___x_4092_; lean_object* v___x_4093_; 
v___x_4088_ = lean_unbox_float(v_a_4026_);
lean_dec(v_a_4026_);
v___x_4089_ = lean_unbox_float(v_a_4056_);
lean_dec(v_a_4056_);
v___x_4090_ = lp_algalVerification_Algal_Expr_fmax(v___x_4088_, v___x_4089_);
v___x_4091_ = lean_unbox_float(v_a_4084_);
lean_dec(v_a_4084_);
v___x_4092_ = lp_algalVerification_Algal_Expr_fmin(v___x_4090_, v___x_4091_);
v___x_4093_ = lp_algalVerification_Algal_Expr_emitNum(v_value_2553_, v___x_4092_);
v___y_4071_ = v___x_4093_;
goto v___jp_4070_;
}
else
{
lean_object* v___x_4094_; lean_object* v___x_4095_; lean_object* v___x_4096_; 
lean_dec(v_a_4084_);
lean_dec(v_a_4056_);
lean_dec(v_a_4026_);
v___x_4094_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__47));
v___x_4095_ = lp_algalVerification_Algal_Expr_errArg(v_value_2553_, v___x_4094_);
v___x_4096_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_4095_);
v___y_4071_ = v___x_4096_;
goto v___jp_4070_;
}
}
v___jp_4070_:
{
lean_object* v_result_4072_; lean_object* v_charges_4073_; lean_object* v___x_4074_; 
v_result_4072_ = lean_ctor_get(v___y_4071_, 0);
lean_inc_ref(v_result_4072_);
v_charges_4073_ = lean_ctor_get(v___y_4071_, 1);
lean_inc(v_charges_4073_);
lean_dec_ref(v___y_4071_);
v___x_4074_ = l_List_appendTR___redArg(v___x_4017_, v_charges_4073_);
v_result_4061_ = v_result_4072_;
v_charges_4062_ = v___x_4074_;
goto v___jp_4060_;
}
}
v___jp_4060_:
{
lean_object* v_charges_4063_; lean_object* v___x_4064_; 
v_charges_4063_ = lean_ctor_get(v___x_4059_, 1);
lean_inc(v_charges_4063_);
lean_dec_ref(v___x_4059_);
v___x_4064_ = l_List_appendTR___redArg(v_charges_4063_, v_charges_4062_);
v_result_4044_ = v_result_4061_;
v_charges_4045_ = v___x_4064_;
goto v___jp_4043_;
}
}
}
v___jp_4043_:
{
lean_object* v___x_4046_; 
v___x_4046_ = l_List_appendTR___redArg(v___x_4017_, v_charges_4045_);
v_result_4031_ = v_result_4044_;
v_charges_4032_ = v___x_4046_;
goto v___jp_4030_;
}
}
}
v___jp_4030_:
{
lean_object* v_charges_4033_; lean_object* v___x_4034_; 
v_charges_4033_ = lean_ctor_get(v___x_4029_, 1);
lean_inc(v_charges_4033_);
lean_dec_ref(v___x_4029_);
v___x_4034_ = l_List_appendTR___redArg(v_charges_4033_, v_charges_4032_);
v_result_4012_ = v_result_4031_;
v_charges_4013_ = v___x_4034_;
goto v___jp_4011_;
}
}
}
v___jp_4011_:
{
lean_object* v___x_4014_; lean_object* v___x_4015_; 
v___x_4014_ = lean_box(0);
v___x_4015_ = l_List_appendTR___redArg(v___x_4014_, v_charges_4013_);
v_result_3999_ = v_result_4012_;
v_charges_4000_ = v___x_4015_;
goto v___jp_3998_;
}
}
}
v___jp_3998_:
{
lean_object* v_charges_4001_; lean_object* v___x_4002_; 
v_charges_4001_ = lean_ctor_get(v___x_3997_, 1);
lean_inc(v_charges_4001_);
lean_dec_ref(v___x_3997_);
v___x_4002_ = l_List_appendTR___redArg(v_charges_4001_, v_charges_4000_);
v_result_2558_ = v_result_3999_;
v_charges_2559_ = v___x_4002_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_4102_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_4102_ = lp_algalVerification_Algal_Expr_machine___lam__21(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_4102_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_4103_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_4103_ = lp_algalVerification_Algal_Expr_machine___lam__21(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_4103_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_4104_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_4104_ = lp_algalVerification_Algal_Expr_machine___lam__21(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_4104_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_4105_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_4105_ = lp_algalVerification_Algal_Expr_machine___lam__21(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_4105_;
goto v___jp_2571_;
}
}
}
else
{
lean_object* v___x_4106_; lean_object* v___x_4107_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
v___x_4106_ = lean_box(0);
v___x_4107_ = lp_algalVerification_Algal_Expr_machine___lam__5(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_4106_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_4107_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_4108_; lean_object* v___x_4109_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
v___x_4108_ = lean_box(0);
v___x_4109_ = lp_algalVerification_Algal_Expr_machine___lam__5(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_4108_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_4109_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_4110_; lean_object* v___x_4111_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
v___x_4110_ = lean_box(0);
v___x_4111_ = lp_algalVerification_Algal_Expr_machine___lam__5(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_4110_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_4111_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_4112_; lean_object* v___x_4113_; 
lean_del_object(v___x_2584_);
lean_del_object(v___x_2519_);
v___x_4112_ = lean_box(0);
v___x_4113_ = lp_algalVerification_Algal_Expr_machine___lam__5(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_4112_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_4113_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_4114_; lean_object* v___x_4115_; 
lean_del_object(v___x_2584_);
lean_dec(v___x_2554_);
lean_del_object(v___x_2519_);
v___x_4114_ = lean_box(0);
v___x_4115_ = lp_algalVerification_Algal_Expr_machine___lam__4(v_value_2553_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_4114_);
v___y_2572_ = v___x_4115_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_4116_; lean_object* v___x_4117_; 
lean_del_object(v___x_2584_);
lean_dec(v___x_2554_);
lean_del_object(v___x_2519_);
v___x_4116_ = lean_box(0);
v___x_4117_ = lp_algalVerification_Algal_Expr_machine___lam__4(v_value_2553_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_4116_);
v___y_2572_ = v___x_4117_;
goto v___jp_2571_;
}
}
else
{
lean_del_object(v___x_2584_);
if (lean_obj_tag(v_rest_2552_) == 1)
{
lean_object* v_rest_4118_; 
v_rest_4118_ = lean_ctor_get(v_rest_2552_, 1);
if (lean_obj_tag(v_rest_4118_) == 0)
{
lean_object* v_value_4119_; lean_object* v___x_4121_; 
lean_dec(v___x_2554_);
v_value_4119_ = lean_ctor_get(v_rest_2552_, 0);
lean_inc(v_value_4119_);
lean_dec_ref_known(v_rest_2552_, 2);
if (v_isShared_2520_ == 0)
{
lean_ctor_set(v___x_2519_, 0, v_value_4119_);
v___x_4121_ = v___x_2519_;
goto v_reusejp_4120_;
}
else
{
lean_object* v_reuseFailAlloc_4149_; 
v_reuseFailAlloc_4149_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4149_, 0, v_value_4119_);
v___x_4121_ = v_reuseFailAlloc_4149_;
goto v_reusejp_4120_;
}
v_reusejp_4120_:
{
lean_object* v___x_4122_; lean_object* v_result_4124_; lean_object* v_charges_4125_; lean_object* v_result_4128_; 
v___x_4122_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_4121_);
v_result_4128_ = lean_ctor_get(v___x_4122_, 0);
lean_inc_ref(v_result_4128_);
if (lean_obj_tag(v_result_4128_) == 0)
{
lean_object* v_charges_4129_; 
lean_dec_ref(v_value_2553_);
v_charges_4129_ = lean_ctor_get(v___x_4122_, 1);
lean_inc(v_charges_4129_);
lean_dec_ref(v___x_4122_);
v_result_2558_ = v_result_4128_;
v_charges_2559_ = v_charges_4129_;
goto v___jp_2557_;
}
else
{
lean_object* v_a_4130_; lean_object* v___x_4131_; lean_object* v___x_4132_; lean_object* v_result_4133_; lean_object* v___x_4134_; 
v_a_4130_ = lean_ctor_get(v_result_4128_, 0);
lean_inc(v_a_4130_);
lean_dec_ref_known(v_result_4128_, 1);
v___x_4131_ = lean_unsigned_to_nat(0u);
lean_inc_ref(v_value_2553_);
v___x_4132_ = lp_algalVerification_Algal_Expr_asNum(v_value_2553_, v___x_4131_, v_a_4130_);
lean_dec(v_a_4130_);
v_result_4133_ = lean_ctor_get(v___x_4132_, 0);
lean_inc_ref(v_result_4133_);
lean_dec_ref(v___x_4132_);
v___x_4134_ = lean_box(0);
if (lean_obj_tag(v_result_4133_) == 0)
{
lean_object* v_a_4135_; lean_object* v___x_4137_; uint8_t v_isShared_4138_; uint8_t v_isSharedCheck_4142_; 
lean_dec_ref(v_value_2553_);
v_a_4135_ = lean_ctor_get(v_result_4133_, 0);
v_isSharedCheck_4142_ = !lean_is_exclusive(v_result_4133_);
if (v_isSharedCheck_4142_ == 0)
{
v___x_4137_ = v_result_4133_;
v_isShared_4138_ = v_isSharedCheck_4142_;
goto v_resetjp_4136_;
}
else
{
lean_inc(v_a_4135_);
lean_dec(v_result_4133_);
v___x_4137_ = lean_box(0);
v_isShared_4138_ = v_isSharedCheck_4142_;
goto v_resetjp_4136_;
}
v_resetjp_4136_:
{
lean_object* v___x_4140_; 
if (v_isShared_4138_ == 0)
{
v___x_4140_ = v___x_4137_;
goto v_reusejp_4139_;
}
else
{
lean_object* v_reuseFailAlloc_4141_; 
v_reuseFailAlloc_4141_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4141_, 0, v_a_4135_);
v___x_4140_ = v_reuseFailAlloc_4141_;
goto v_reusejp_4139_;
}
v_reusejp_4139_:
{
v_result_4124_ = v___x_4140_;
v_charges_4125_ = v___x_4134_;
goto v___jp_4123_;
}
}
}
else
{
lean_object* v_a_4143_; double v___x_4144_; double v___x_4145_; lean_object* v___x_4146_; lean_object* v_result_4147_; lean_object* v___x_4148_; 
v_a_4143_ = lean_ctor_get(v_result_4133_, 0);
lean_inc(v_a_4143_);
lean_dec_ref_known(v_result_4133_, 1);
v___x_4144_ = lean_unbox_float(v_a_4143_);
lean_dec(v_a_4143_);
v___x_4145_ = lean_float_negate(v___x_4144_);
v___x_4146_ = lp_algalVerification_Algal_Expr_emitNum(v_value_2553_, v___x_4145_);
v_result_4147_ = lean_ctor_get(v___x_4146_, 0);
lean_inc_ref(v_result_4147_);
lean_dec_ref(v___x_4146_);
v___x_4148_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___lam__4___closed__1, &lp_algalVerification_Algal_Expr_machine___lam__4___closed__1_once, _init_lp_algalVerification_Algal_Expr_machine___lam__4___closed__1);
v_result_4124_ = v_result_4147_;
v_charges_4125_ = v___x_4148_;
goto v___jp_4123_;
}
}
v___jp_4123_:
{
lean_object* v_charges_4126_; lean_object* v___x_4127_; 
v_charges_4126_ = lean_ctor_get(v___x_4122_, 1);
lean_inc(v_charges_4126_);
lean_dec_ref(v___x_4122_);
lean_inc(v_charges_4125_);
v___x_4127_ = l_List_appendTR___redArg(v_charges_4126_, v_charges_4125_);
v_result_2558_ = v_result_4124_;
v_charges_2559_ = v___x_4127_;
goto v___jp_2557_;
}
}
}
else
{
lean_object* v___x_4150_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_4150_ = lp_algalVerification_Algal_Expr_machine___lam__22(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec_ref_known(v_rest_2552_, 2);
v___y_2572_ = v___x_4150_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_4151_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_4151_ = lp_algalVerification_Algal_Expr_machine___lam__22(v_value_2553_, v___x_2554_, v_rest_2552_);
lean_dec(v_rest_2552_);
v___y_2572_ = v___x_4151_;
goto v___jp_2571_;
}
}
}
}
else
{
lean_object* v___x_4154_; lean_object* v___x_4155_; 
lean_del_object(v___x_2519_);
v___x_4154_ = lean_box(0);
v___x_4155_ = lp_algalVerification_Algal_Expr_machine___lam__2(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v_value_2551_, v___x_4154_);
v___y_2572_ = v___x_4155_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_4156_; lean_object* v___x_4157_; 
lean_del_object(v___x_2519_);
v___x_4156_ = lean_box(0);
v___x_4157_ = lp_algalVerification_Algal_Expr_machine___lam__2(v_value_2553_, v___x_2554_, v_rest_2552_, v_env_2514_, v_scope_2515_, v_value_2551_, v___x_4156_);
v___y_2572_ = v___x_4157_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_4158_; lean_object* v___x_4159_; 
lean_dec(v___x_2554_);
lean_dec_ref_known(v_value_2551_, 1);
lean_del_object(v___x_2519_);
v___x_4158_ = lean_box(0);
v___x_4159_ = lp_algalVerification_Algal_Expr_machine___lam__1(v_value_2553_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_4158_);
v___y_2572_ = v___x_4159_;
goto v___jp_2571_;
}
}
else
{
lean_object* v___x_4160_; lean_object* v___x_4161_; 
lean_dec(v___x_2554_);
lean_dec_ref_known(v_value_2551_, 1);
lean_del_object(v___x_2519_);
v___x_4160_ = lean_box(0);
v___x_4161_ = lp_algalVerification_Algal_Expr_machine___lam__1(v_value_2553_, v_rest_2552_, v_env_2514_, v_scope_2515_, v___x_4160_);
v___y_2572_ = v___x_4161_;
goto v___jp_2571_;
}
v___jp_2557_:
{
lean_object* v_charges_2560_; lean_object* v___x_2562_; uint8_t v_isShared_2563_; uint8_t v_isSharedCheck_2569_; 
v_charges_2560_ = lean_ctor_get(v___x_2556_, 1);
v_isSharedCheck_2569_ = !lean_is_exclusive(v___x_2556_);
if (v_isSharedCheck_2569_ == 0)
{
lean_object* v_unused_2570_; 
v_unused_2570_ = lean_ctor_get(v___x_2556_, 0);
lean_dec(v_unused_2570_);
v___x_2562_ = v___x_2556_;
v_isShared_2563_ = v_isSharedCheck_2569_;
goto v_resetjp_2561_;
}
else
{
lean_inc(v_charges_2560_);
lean_dec(v___x_2556_);
v___x_2562_ = lean_box(0);
v_isShared_2563_ = v_isSharedCheck_2569_;
goto v_resetjp_2561_;
}
v_resetjp_2561_:
{
lean_object* v___x_2564_; lean_object* v___x_2566_; 
v___x_2564_ = l_List_appendTR___redArg(v_charges_2560_, v_charges_2559_);
if (v_isShared_2563_ == 0)
{
lean_ctor_set(v___x_2562_, 1, v___x_2564_);
lean_ctor_set(v___x_2562_, 0, v_result_2558_);
v___x_2566_ = v___x_2562_;
goto v_reusejp_2565_;
}
else
{
lean_object* v_reuseFailAlloc_2568_; 
v_reuseFailAlloc_2568_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2568_, 0, v_result_2558_);
lean_ctor_set(v_reuseFailAlloc_2568_, 1, v___x_2564_);
v___x_2566_ = v_reuseFailAlloc_2568_;
goto v_reusejp_2565_;
}
v_reusejp_2565_:
{
lean_object* v___x_2567_; 
v___x_2567_ = lp_algalVerification_Algal_Expr_postCheck(v___x_2566_);
return v___x_2567_;
}
}
}
v___jp_2571_:
{
lean_object* v_result_2573_; lean_object* v_charges_2574_; 
v_result_2573_ = lean_ctor_get(v___y_2572_, 0);
lean_inc_ref(v_result_2573_);
v_charges_2574_ = lean_ctor_get(v___y_2572_, 1);
lean_inc(v_charges_2574_);
lean_dec_ref(v___y_2572_);
v_result_2558_ = v_result_2573_;
v_charges_2559_ = v_charges_2574_;
goto v___jp_2557_;
}
}
else
{
lean_object* v___x_4163_; uint8_t v_isShared_4164_; uint8_t v_isSharedCheck_4180_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v_isSharedCheck_4180_ = !lean_is_exclusive(v_values_2546_);
if (v_isSharedCheck_4180_ == 0)
{
lean_object* v_unused_4181_; lean_object* v_unused_4182_; 
v_unused_4181_ = lean_ctor_get(v_values_2546_, 1);
lean_dec(v_unused_4181_);
v_unused_4182_ = lean_ctor_get(v_values_2546_, 0);
lean_dec(v_unused_4182_);
v___x_4163_ = v_values_2546_;
v_isShared_4164_ = v_isSharedCheck_4180_;
goto v_resetjp_4162_;
}
else
{
lean_dec(v_values_2546_);
v___x_4163_ = lean_box(0);
v_isShared_4164_ = v_isSharedCheck_4180_;
goto v_resetjp_4162_;
}
v_resetjp_4162_:
{
uint8_t v___x_4165_; lean_object* v___x_4166_; lean_object* v___x_4167_; lean_object* v___x_4168_; lean_object* v___x_4170_; 
v___x_4165_ = 0;
v___x_4166_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__5));
v___x_4167_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__48));
v___x_4168_ = lp_algalVerification_Algal_Expr_kindOf(v_value_2551_);
lean_dec(v_value_2551_);
if (v_isShared_2549_ == 0)
{
lean_ctor_set_tag(v___x_2548_, 3);
lean_ctor_set(v___x_2548_, 0, v___x_4168_);
v___x_4170_ = v___x_2548_;
goto v_reusejp_4169_;
}
else
{
lean_object* v_reuseFailAlloc_4179_; 
v_reuseFailAlloc_4179_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4179_, 0, v___x_4168_);
v___x_4170_ = v_reuseFailAlloc_4179_;
goto v_reusejp_4169_;
}
v_reusejp_4169_:
{
lean_object* v___x_4172_; 
if (v_isShared_4164_ == 0)
{
lean_ctor_set_tag(v___x_4163_, 0);
lean_ctor_set(v___x_4163_, 1, v___x_4170_);
lean_ctor_set(v___x_4163_, 0, v___x_4167_);
v___x_4172_ = v___x_4163_;
goto v_reusejp_4171_;
}
else
{
lean_object* v_reuseFailAlloc_4178_; 
v_reuseFailAlloc_4178_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_4178_, 0, v___x_4167_);
lean_ctor_set(v_reuseFailAlloc_4178_, 1, v___x_4170_);
v___x_4172_ = v_reuseFailAlloc_4178_;
goto v_reusejp_4171_;
}
v_reusejp_4171_:
{
lean_object* v___x_4173_; lean_object* v___x_4174_; lean_object* v___x_4175_; lean_object* v___x_4176_; lean_object* v___x_4177_; 
v___x_4173_ = lean_box(0);
v___x_4174_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_4174_, 0, v___x_4172_);
lean_ctor_set(v___x_4174_, 1, v___x_4173_);
v___x_4175_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_4175_, 0, v___x_4166_);
lean_ctor_set(v___x_4175_, 1, v___x_4174_);
v___x_4176_ = lean_alloc_ctor(0, 1, 1);
lean_ctor_set(v___x_4176_, 0, v___x_4175_);
lean_ctor_set_uint8(v___x_4176_, sizeof(void*)*1, v___x_4165_);
v___x_4177_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_4176_);
return v___x_4177_;
}
}
}
}
}
}
}
default: 
{
lean_object* v___x_4184_; lean_object* v_charges_4185_; lean_object* v___x_4186_; lean_object* v___x_4187_; lean_object* v___x_4188_; lean_object* v___x_4189_; lean_object* v___x_4190_; 
lean_del_object(v___x_2519_);
lean_dec(v_scope_2515_);
v___x_4184_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___closed__0, &lp_algalVerification_Algal_Expr_machine___closed__0_once, _init_lp_algalVerification_Algal_Expr_machine___closed__0);
v_charges_4185_ = lean_ctor_get(v___x_4184_, 1);
v___x_4186_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_4186_, 0, v_v_2517_);
v___x_4187_ = lean_box(0);
lean_inc(v_charges_4185_);
v___x_4188_ = l_List_appendTR___redArg(v_charges_4185_, v___x_4187_);
v___x_4189_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_4189_, 0, v___x_4186_);
lean_ctor_set(v___x_4189_, 1, v___x_4188_);
v___x_4190_ = lp_algalVerification_Algal_Expr_postCheck(v___x_4189_);
return v___x_4190_;
}
}
}
}
case 1:
{
lean_object* v_pending_4192_; 
v_pending_4192_ = lean_ctor_get(v_w_2516_, 0);
lean_inc(v_pending_4192_);
if (lean_obj_tag(v_pending_4192_) == 0)
{
lean_object* v_acc_4193_; lean_object* v___x_4194_; lean_object* v___x_4195_; lean_object* v___x_4196_; lean_object* v___x_4197_; lean_object* v___x_4198_; 
lean_dec(v_scope_2515_);
v_acc_4193_ = lean_ctor_get(v_w_2516_, 1);
lean_inc(v_acc_4193_);
lean_dec_ref_known(v_w_2516_, 3);
v___x_4194_ = lp_algalVerification_Algal_Expr_itemsReverse(v_acc_4193_);
v___x_4195_ = lean_alloc_ctor(4, 1, 0);
lean_ctor_set(v___x_4195_, 0, v___x_4194_);
v___x_4196_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_4196_, 0, v___x_4195_);
v___x_4197_ = lean_box(0);
v___x_4198_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_4198_, 0, v___x_4196_);
lean_ctor_set(v___x_4198_, 1, v___x_4197_);
return v___x_4198_;
}
else
{
lean_object* v_acc_4199_; lean_object* v_bytes_4200_; lean_object* v___x_4202_; uint8_t v_isShared_4203_; uint8_t v_isSharedCheck_4281_; 
v_acc_4199_ = lean_ctor_get(v_w_2516_, 1);
v_bytes_4200_ = lean_ctor_get(v_w_2516_, 2);
v_isSharedCheck_4281_ = !lean_is_exclusive(v_w_2516_);
if (v_isSharedCheck_4281_ == 0)
{
lean_object* v_unused_4282_; 
v_unused_4282_ = lean_ctor_get(v_w_2516_, 0);
lean_dec(v_unused_4282_);
v___x_4202_ = v_w_2516_;
v_isShared_4203_ = v_isSharedCheck_4281_;
goto v_resetjp_4201_;
}
else
{
lean_inc(v_bytes_4200_);
lean_inc(v_acc_4199_);
lean_dec(v_w_2516_);
v___x_4202_ = lean_box(0);
v_isShared_4203_ = v_isSharedCheck_4281_;
goto v_resetjp_4201_;
}
v_resetjp_4201_:
{
lean_object* v_value_4204_; lean_object* v_rest_4205_; lean_object* v___x_4207_; uint8_t v_isShared_4208_; uint8_t v_isSharedCheck_4280_; 
v_value_4204_ = lean_ctor_get(v_pending_4192_, 0);
v_rest_4205_ = lean_ctor_get(v_pending_4192_, 1);
v_isSharedCheck_4280_ = !lean_is_exclusive(v_pending_4192_);
if (v_isSharedCheck_4280_ == 0)
{
v___x_4207_ = v_pending_4192_;
v_isShared_4208_ = v_isSharedCheck_4280_;
goto v_resetjp_4206_;
}
else
{
lean_inc(v_rest_4205_);
lean_inc(v_value_4204_);
lean_dec(v_pending_4192_);
v___x_4207_ = lean_box(0);
v_isShared_4208_ = v_isSharedCheck_4280_;
goto v_resetjp_4206_;
}
v_resetjp_4206_:
{
lean_object* v___x_4209_; lean_object* v___x_4210_; lean_object* v_result_4212_; lean_object* v_charges_4213_; lean_object* v_result_4224_; 
v___x_4209_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_4209_, 0, v_value_4204_);
lean_inc(v_scope_2515_);
v___x_4210_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_4209_);
v_result_4224_ = lean_ctor_get(v___x_4210_, 0);
lean_inc_ref(v_result_4224_);
if (lean_obj_tag(v_result_4224_) == 0)
{
lean_object* v_charges_4225_; lean_object* v___x_4227_; uint8_t v_isShared_4228_; uint8_t v_isSharedCheck_4232_; 
lean_del_object(v___x_4207_);
lean_dec(v_rest_4205_);
lean_del_object(v___x_4202_);
lean_dec(v_bytes_4200_);
lean_dec(v_acc_4199_);
lean_dec(v_scope_2515_);
v_charges_4225_ = lean_ctor_get(v___x_4210_, 1);
v_isSharedCheck_4232_ = !lean_is_exclusive(v___x_4210_);
if (v_isSharedCheck_4232_ == 0)
{
lean_object* v_unused_4233_; 
v_unused_4233_ = lean_ctor_get(v___x_4210_, 0);
lean_dec(v_unused_4233_);
v___x_4227_ = v___x_4210_;
v_isShared_4228_ = v_isSharedCheck_4232_;
goto v_resetjp_4226_;
}
else
{
lean_inc(v_charges_4225_);
lean_dec(v___x_4210_);
v___x_4227_ = lean_box(0);
v_isShared_4228_ = v_isSharedCheck_4232_;
goto v_resetjp_4226_;
}
v_resetjp_4226_:
{
lean_object* v___x_4230_; 
if (v_isShared_4228_ == 0)
{
v___x_4230_ = v___x_4227_;
goto v_reusejp_4229_;
}
else
{
lean_object* v_reuseFailAlloc_4231_; 
v_reuseFailAlloc_4231_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_4231_, 0, v_result_4224_);
lean_ctor_set(v_reuseFailAlloc_4231_, 1, v_charges_4225_);
v___x_4230_ = v_reuseFailAlloc_4231_;
goto v_reusejp_4229_;
}
v_reusejp_4229_:
{
return v___x_4230_;
}
}
}
else
{
lean_object* v_a_4234_; lean_object* v___x_4235_; lean_object* v___x_4236_; lean_object* v___x_4237_; lean_object* v_result_4239_; lean_object* v_charges_4240_; lean_object* v_result_4243_; lean_object* v___x_4244_; 
v_a_4234_ = lean_ctor_get(v_result_4224_, 0);
lean_inc_n(v_a_4234_, 2);
lean_dec_ref_known(v_result_4224_, 1);
v___x_4235_ = lean_unsigned_to_nat(0u);
v___x_4236_ = lp_algalVerification_Algal_Expr_valueBytes(v_a_4234_, v___x_4235_);
v___x_4237_ = lp_algalVerification_Algal_Expr_liftE___redArg(v___x_4236_);
v_result_4243_ = lean_ctor_get(v___x_4237_, 0);
lean_inc_ref(v_result_4243_);
lean_dec_ref(v___x_4237_);
v___x_4244_ = lean_box(0);
if (lean_obj_tag(v_result_4243_) == 0)
{
lean_object* v_a_4245_; lean_object* v___x_4247_; uint8_t v_isShared_4248_; uint8_t v_isSharedCheck_4252_; 
lean_dec(v_a_4234_);
lean_del_object(v___x_4207_);
lean_dec(v_rest_4205_);
lean_del_object(v___x_4202_);
lean_dec(v_bytes_4200_);
lean_dec(v_acc_4199_);
lean_dec(v_scope_2515_);
v_a_4245_ = lean_ctor_get(v_result_4243_, 0);
v_isSharedCheck_4252_ = !lean_is_exclusive(v_result_4243_);
if (v_isSharedCheck_4252_ == 0)
{
v___x_4247_ = v_result_4243_;
v_isShared_4248_ = v_isSharedCheck_4252_;
goto v_resetjp_4246_;
}
else
{
lean_inc(v_a_4245_);
lean_dec(v_result_4243_);
v___x_4247_ = lean_box(0);
v_isShared_4248_ = v_isSharedCheck_4252_;
goto v_resetjp_4246_;
}
v_resetjp_4246_:
{
lean_object* v___x_4250_; 
if (v_isShared_4248_ == 0)
{
v___x_4250_ = v___x_4247_;
goto v_reusejp_4249_;
}
else
{
lean_object* v_reuseFailAlloc_4251_; 
v_reuseFailAlloc_4251_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4251_, 0, v_a_4245_);
v___x_4250_ = v_reuseFailAlloc_4251_;
goto v_reusejp_4249_;
}
v_reusejp_4249_:
{
v_result_4212_ = v___x_4250_;
v_charges_4213_ = v___x_4244_;
goto v___jp_4211_;
}
}
}
else
{
lean_object* v_a_4253_; lean_object* v___y_4255_; 
v_a_4253_ = lean_ctor_get(v_result_4243_, 0);
lean_inc(v_a_4253_);
lean_dec_ref_known(v_result_4243_, 1);
if (lean_obj_tag(v_acc_4199_) == 0)
{
v___y_4255_ = v___x_4235_;
goto v___jp_4254_;
}
else
{
lean_object* v___x_4279_; 
v___x_4279_ = lean_unsigned_to_nat(1u);
v___y_4255_ = v___x_4279_;
goto v___jp_4254_;
}
v___jp_4254_:
{
lean_object* v___x_4256_; lean_object* v___x_4257_; lean_object* v___x_4258_; lean_object* v_result_4259_; 
v___x_4256_ = lean_nat_add(v_a_4253_, v___y_4255_);
lean_dec(v_a_4253_);
v___x_4257_ = lp_algalVerification_Algal_Expr_addValueBytes(v_bytes_4200_, v___x_4256_);
lean_dec(v___x_4256_);
lean_dec(v_bytes_4200_);
v___x_4258_ = lp_algalVerification_Algal_Expr_liftE___redArg(v___x_4257_);
v_result_4259_ = lean_ctor_get(v___x_4258_, 0);
lean_inc_ref(v_result_4259_);
lean_dec_ref(v___x_4258_);
if (lean_obj_tag(v_result_4259_) == 0)
{
lean_object* v_a_4260_; lean_object* v___x_4262_; uint8_t v_isShared_4263_; uint8_t v_isSharedCheck_4267_; 
lean_dec(v_a_4234_);
lean_del_object(v___x_4207_);
lean_dec(v_rest_4205_);
lean_del_object(v___x_4202_);
lean_dec(v_acc_4199_);
lean_dec(v_scope_2515_);
v_a_4260_ = lean_ctor_get(v_result_4259_, 0);
v_isSharedCheck_4267_ = !lean_is_exclusive(v_result_4259_);
if (v_isSharedCheck_4267_ == 0)
{
v___x_4262_ = v_result_4259_;
v_isShared_4263_ = v_isSharedCheck_4267_;
goto v_resetjp_4261_;
}
else
{
lean_inc(v_a_4260_);
lean_dec(v_result_4259_);
v___x_4262_ = lean_box(0);
v_isShared_4263_ = v_isSharedCheck_4267_;
goto v_resetjp_4261_;
}
v_resetjp_4261_:
{
lean_object* v___x_4265_; 
if (v_isShared_4263_ == 0)
{
v___x_4265_ = v___x_4262_;
goto v_reusejp_4264_;
}
else
{
lean_object* v_reuseFailAlloc_4266_; 
v_reuseFailAlloc_4266_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4266_, 0, v_a_4260_);
v___x_4265_ = v_reuseFailAlloc_4266_;
goto v_reusejp_4264_;
}
v_reusejp_4264_:
{
v_result_4239_ = v___x_4265_;
v_charges_4240_ = v___x_4244_;
goto v___jp_4238_;
}
}
}
else
{
lean_object* v_a_4268_; lean_object* v___x_4270_; 
v_a_4268_ = lean_ctor_get(v_result_4259_, 0);
lean_inc(v_a_4268_);
lean_dec_ref_known(v_result_4259_, 1);
if (v_isShared_4208_ == 0)
{
lean_ctor_set(v___x_4207_, 1, v_acc_4199_);
lean_ctor_set(v___x_4207_, 0, v_a_4234_);
v___x_4270_ = v___x_4207_;
goto v_reusejp_4269_;
}
else
{
lean_object* v_reuseFailAlloc_4278_; 
v_reuseFailAlloc_4278_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_4278_, 0, v_a_4234_);
lean_ctor_set(v_reuseFailAlloc_4278_, 1, v_acc_4199_);
v___x_4270_ = v_reuseFailAlloc_4278_;
goto v_reusejp_4269_;
}
v_reusejp_4269_:
{
lean_object* v___x_4272_; 
if (v_isShared_4203_ == 0)
{
lean_ctor_set(v___x_4202_, 2, v_a_4268_);
lean_ctor_set(v___x_4202_, 1, v___x_4270_);
lean_ctor_set(v___x_4202_, 0, v_rest_4205_);
v___x_4272_ = v___x_4202_;
goto v_reusejp_4271_;
}
else
{
lean_object* v_reuseFailAlloc_4277_; 
v_reuseFailAlloc_4277_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v_reuseFailAlloc_4277_, 0, v_rest_4205_);
lean_ctor_set(v_reuseFailAlloc_4277_, 1, v___x_4270_);
lean_ctor_set(v_reuseFailAlloc_4277_, 2, v_a_4268_);
v___x_4272_ = v_reuseFailAlloc_4277_;
goto v_reusejp_4271_;
}
v_reusejp_4271_:
{
lean_object* v___x_4273_; lean_object* v_result_4274_; lean_object* v_charges_4275_; lean_object* v___x_4276_; 
v___x_4273_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_4272_);
v_result_4274_ = lean_ctor_get(v___x_4273_, 0);
lean_inc_ref(v_result_4274_);
v_charges_4275_ = lean_ctor_get(v___x_4273_, 1);
lean_inc(v_charges_4275_);
lean_dec_ref(v___x_4273_);
v___x_4276_ = l_List_appendTR___redArg(v___x_4244_, v_charges_4275_);
v_result_4239_ = v_result_4274_;
v_charges_4240_ = v___x_4276_;
goto v___jp_4238_;
}
}
}
}
}
v___jp_4238_:
{
lean_object* v___x_4241_; lean_object* v___x_4242_; 
v___x_4241_ = lean_box(0);
v___x_4242_ = l_List_appendTR___redArg(v___x_4241_, v_charges_4240_);
v_result_4212_ = v_result_4239_;
v_charges_4213_ = v___x_4242_;
goto v___jp_4211_;
}
}
v___jp_4211_:
{
lean_object* v_charges_4214_; lean_object* v___x_4216_; uint8_t v_isShared_4217_; uint8_t v_isSharedCheck_4222_; 
v_charges_4214_ = lean_ctor_get(v___x_4210_, 1);
v_isSharedCheck_4222_ = !lean_is_exclusive(v___x_4210_);
if (v_isSharedCheck_4222_ == 0)
{
lean_object* v_unused_4223_; 
v_unused_4223_ = lean_ctor_get(v___x_4210_, 0);
lean_dec(v_unused_4223_);
v___x_4216_ = v___x_4210_;
v_isShared_4217_ = v_isSharedCheck_4222_;
goto v_resetjp_4215_;
}
else
{
lean_inc(v_charges_4214_);
lean_dec(v___x_4210_);
v___x_4216_ = lean_box(0);
v_isShared_4217_ = v_isSharedCheck_4222_;
goto v_resetjp_4215_;
}
v_resetjp_4215_:
{
lean_object* v___x_4218_; lean_object* v___x_4220_; 
v___x_4218_ = l_List_appendTR___redArg(v_charges_4214_, v_charges_4213_);
if (v_isShared_4217_ == 0)
{
lean_ctor_set(v___x_4216_, 1, v___x_4218_);
lean_ctor_set(v___x_4216_, 0, v_result_4212_);
v___x_4220_ = v___x_4216_;
goto v_reusejp_4219_;
}
else
{
lean_object* v_reuseFailAlloc_4221_; 
v_reuseFailAlloc_4221_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_4221_, 0, v_result_4212_);
lean_ctor_set(v_reuseFailAlloc_4221_, 1, v___x_4218_);
v___x_4220_ = v_reuseFailAlloc_4221_;
goto v_reusejp_4219_;
}
v_reusejp_4219_:
{
return v___x_4220_;
}
}
}
}
}
}
}
case 2:
{
lean_object* v_pending_4283_; 
v_pending_4283_ = lean_ctor_get(v_w_2516_, 0);
lean_inc(v_pending_4283_);
if (lean_obj_tag(v_pending_4283_) == 0)
{
lean_object* v_acc_4284_; lean_object* v___x_4285_; lean_object* v___x_4286_; lean_object* v___x_4287_; lean_object* v___x_4288_; lean_object* v___x_4289_; 
lean_dec(v_scope_2515_);
v_acc_4284_ = lean_ctor_get(v_w_2516_, 1);
lean_inc(v_acc_4284_);
lean_dec_ref_known(v_w_2516_, 3);
v___x_4285_ = lp_algalVerification_Algal_Expr_canonicalizeAcc(v_acc_4284_);
v___x_4286_ = lean_alloc_ctor(5, 1, 0);
lean_ctor_set(v___x_4286_, 0, v___x_4285_);
v___x_4287_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_4287_, 0, v___x_4286_);
v___x_4288_ = lean_box(0);
v___x_4289_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_4289_, 0, v___x_4287_);
lean_ctor_set(v___x_4289_, 1, v___x_4288_);
return v___x_4289_;
}
else
{
lean_object* v_acc_4290_; lean_object* v_bytes_4291_; lean_object* v___x_4293_; uint8_t v_isShared_4294_; uint8_t v_isSharedCheck_4396_; 
v_acc_4290_ = lean_ctor_get(v_w_2516_, 1);
v_bytes_4291_ = lean_ctor_get(v_w_2516_, 2);
v_isSharedCheck_4396_ = !lean_is_exclusive(v_w_2516_);
if (v_isSharedCheck_4396_ == 0)
{
lean_object* v_unused_4397_; 
v_unused_4397_ = lean_ctor_get(v_w_2516_, 0);
lean_dec(v_unused_4397_);
v___x_4293_ = v_w_2516_;
v_isShared_4294_ = v_isSharedCheck_4396_;
goto v_resetjp_4292_;
}
else
{
lean_inc(v_bytes_4291_);
lean_inc(v_acc_4290_);
lean_dec(v_w_2516_);
v___x_4293_ = lean_box(0);
v_isShared_4294_ = v_isSharedCheck_4396_;
goto v_resetjp_4292_;
}
v_resetjp_4292_:
{
lean_object* v_key_4295_; lean_object* v_value_4296_; lean_object* v_rest_4297_; lean_object* v___x_4299_; uint8_t v_isShared_4300_; uint8_t v_isSharedCheck_4395_; 
v_key_4295_ = lean_ctor_get(v_pending_4283_, 0);
v_value_4296_ = lean_ctor_get(v_pending_4283_, 1);
v_rest_4297_ = lean_ctor_get(v_pending_4283_, 2);
v_isSharedCheck_4395_ = !lean_is_exclusive(v_pending_4283_);
if (v_isSharedCheck_4395_ == 0)
{
v___x_4299_ = v_pending_4283_;
v_isShared_4300_ = v_isSharedCheck_4395_;
goto v_resetjp_4298_;
}
else
{
lean_inc(v_rest_4297_);
lean_inc(v_value_4296_);
lean_inc(v_key_4295_);
lean_dec(v_pending_4283_);
v___x_4299_ = lean_box(0);
v_isShared_4300_ = v_isSharedCheck_4395_;
goto v_resetjp_4298_;
}
v_resetjp_4298_:
{
lean_object* v___x_4301_; lean_object* v___x_4302_; lean_object* v_result_4304_; lean_object* v_charges_4305_; lean_object* v___y_4317_; lean_object* v_result_4318_; lean_object* v_charges_4319_; lean_object* v___y_4323_; lean_object* v___y_4324_; lean_object* v_result_4325_; lean_object* v_charges_4326_; lean_object* v_result_4329_; 
v___x_4301_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_4301_, 0, v_value_4296_);
lean_inc(v_scope_2515_);
v___x_4302_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_4301_);
v_result_4329_ = lean_ctor_get(v___x_4302_, 0);
lean_inc_ref(v_result_4329_);
if (lean_obj_tag(v_result_4329_) == 0)
{
lean_object* v_charges_4330_; lean_object* v___x_4332_; uint8_t v_isShared_4333_; uint8_t v_isSharedCheck_4337_; 
lean_del_object(v___x_4299_);
lean_dec(v_rest_4297_);
lean_dec_ref(v_key_4295_);
lean_del_object(v___x_4293_);
lean_dec(v_bytes_4291_);
lean_dec(v_acc_4290_);
lean_dec(v_scope_2515_);
v_charges_4330_ = lean_ctor_get(v___x_4302_, 1);
v_isSharedCheck_4337_ = !lean_is_exclusive(v___x_4302_);
if (v_isSharedCheck_4337_ == 0)
{
lean_object* v_unused_4338_; 
v_unused_4338_ = lean_ctor_get(v___x_4302_, 0);
lean_dec(v_unused_4338_);
v___x_4332_ = v___x_4302_;
v_isShared_4333_ = v_isSharedCheck_4337_;
goto v_resetjp_4331_;
}
else
{
lean_inc(v_charges_4330_);
lean_dec(v___x_4302_);
v___x_4332_ = lean_box(0);
v_isShared_4333_ = v_isSharedCheck_4337_;
goto v_resetjp_4331_;
}
v_resetjp_4331_:
{
lean_object* v___x_4335_; 
if (v_isShared_4333_ == 0)
{
v___x_4335_ = v___x_4332_;
goto v_reusejp_4334_;
}
else
{
lean_object* v_reuseFailAlloc_4336_; 
v_reuseFailAlloc_4336_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_4336_, 0, v_result_4329_);
lean_ctor_set(v_reuseFailAlloc_4336_, 1, v_charges_4330_);
v___x_4335_ = v_reuseFailAlloc_4336_;
goto v_reusejp_4334_;
}
v_reusejp_4334_:
{
return v___x_4335_;
}
}
}
else
{
lean_object* v_a_4339_; lean_object* v___y_4341_; 
v_a_4339_ = lean_ctor_get(v_result_4329_, 0);
lean_inc(v_a_4339_);
lean_dec_ref_known(v_result_4329_, 1);
if (lean_obj_tag(v_acc_4290_) == 0)
{
lean_object* v___x_4393_; 
v___x_4393_ = lean_unsigned_to_nat(0u);
v___y_4341_ = v___x_4393_;
goto v___jp_4340_;
}
else
{
lean_object* v___x_4394_; 
v___x_4394_ = lean_unsigned_to_nat(1u);
v___y_4341_ = v___x_4394_;
goto v___jp_4340_;
}
v___jp_4340_:
{
lean_object* v___x_4342_; lean_object* v___x_4343_; lean_object* v___x_4344_; lean_object* v___x_4345_; lean_object* v___x_4346_; lean_object* v___x_4347_; lean_object* v_result_4348_; lean_object* v___x_4349_; 
lean_inc_ref(v_key_4295_);
v___x_4342_ = lp_algalVerification_Algal_Expr_stringBytes(v_key_4295_);
v___x_4343_ = lean_unsigned_to_nat(1u);
v___x_4344_ = lean_nat_add(v___x_4342_, v___x_4343_);
lean_dec(v___x_4342_);
v___x_4345_ = lean_nat_add(v___x_4344_, v___y_4341_);
lean_dec(v___x_4344_);
v___x_4346_ = lp_algalVerification_Algal_Expr_addValueBytes(v_bytes_4291_, v___x_4345_);
lean_dec(v___x_4345_);
lean_dec(v_bytes_4291_);
v___x_4347_ = lp_algalVerification_Algal_Expr_liftE___redArg(v___x_4346_);
v_result_4348_ = lean_ctor_get(v___x_4347_, 0);
lean_inc_ref(v_result_4348_);
v___x_4349_ = lean_box(0);
if (lean_obj_tag(v_result_4348_) == 0)
{
lean_object* v_a_4350_; lean_object* v___x_4352_; uint8_t v_isShared_4353_; uint8_t v_isSharedCheck_4357_; 
lean_dec_ref(v___x_4347_);
lean_dec(v_a_4339_);
lean_del_object(v___x_4299_);
lean_dec(v_rest_4297_);
lean_dec_ref(v_key_4295_);
lean_del_object(v___x_4293_);
lean_dec(v_acc_4290_);
lean_dec(v_scope_2515_);
v_a_4350_ = lean_ctor_get(v_result_4348_, 0);
v_isSharedCheck_4357_ = !lean_is_exclusive(v_result_4348_);
if (v_isSharedCheck_4357_ == 0)
{
v___x_4352_ = v_result_4348_;
v_isShared_4353_ = v_isSharedCheck_4357_;
goto v_resetjp_4351_;
}
else
{
lean_inc(v_a_4350_);
lean_dec(v_result_4348_);
v___x_4352_ = lean_box(0);
v_isShared_4353_ = v_isSharedCheck_4357_;
goto v_resetjp_4351_;
}
v_resetjp_4351_:
{
lean_object* v___x_4355_; 
if (v_isShared_4353_ == 0)
{
v___x_4355_ = v___x_4352_;
goto v_reusejp_4354_;
}
else
{
lean_object* v_reuseFailAlloc_4356_; 
v_reuseFailAlloc_4356_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4356_, 0, v_a_4350_);
v___x_4355_ = v_reuseFailAlloc_4356_;
goto v_reusejp_4354_;
}
v_reusejp_4354_:
{
v_result_4304_ = v___x_4355_;
v_charges_4305_ = v___x_4349_;
goto v___jp_4303_;
}
}
}
else
{
lean_object* v_a_4358_; lean_object* v___x_4359_; lean_object* v___x_4360_; lean_object* v_result_4361_; 
v_a_4358_ = lean_ctor_get(v_result_4348_, 0);
lean_inc(v_a_4358_);
lean_dec_ref_known(v_result_4348_, 1);
lean_inc(v_a_4339_);
v___x_4359_ = lp_algalVerification_Algal_Expr_valueBytes(v_a_4339_, v___x_4343_);
v___x_4360_ = lp_algalVerification_Algal_Expr_liftE___redArg(v___x_4359_);
v_result_4361_ = lean_ctor_get(v___x_4360_, 0);
lean_inc_ref(v_result_4361_);
if (lean_obj_tag(v_result_4361_) == 0)
{
lean_object* v_a_4362_; lean_object* v___x_4364_; uint8_t v_isShared_4365_; uint8_t v_isSharedCheck_4369_; 
lean_dec_ref(v___x_4360_);
lean_dec(v_a_4358_);
lean_dec(v_a_4339_);
lean_del_object(v___x_4299_);
lean_dec(v_rest_4297_);
lean_dec_ref(v_key_4295_);
lean_del_object(v___x_4293_);
lean_dec(v_acc_4290_);
lean_dec(v_scope_2515_);
v_a_4362_ = lean_ctor_get(v_result_4361_, 0);
v_isSharedCheck_4369_ = !lean_is_exclusive(v_result_4361_);
if (v_isSharedCheck_4369_ == 0)
{
v___x_4364_ = v_result_4361_;
v_isShared_4365_ = v_isSharedCheck_4369_;
goto v_resetjp_4363_;
}
else
{
lean_inc(v_a_4362_);
lean_dec(v_result_4361_);
v___x_4364_ = lean_box(0);
v_isShared_4365_ = v_isSharedCheck_4369_;
goto v_resetjp_4363_;
}
v_resetjp_4363_:
{
lean_object* v___x_4367_; 
if (v_isShared_4365_ == 0)
{
v___x_4367_ = v___x_4364_;
goto v_reusejp_4366_;
}
else
{
lean_object* v_reuseFailAlloc_4368_; 
v_reuseFailAlloc_4368_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4368_, 0, v_a_4362_);
v___x_4367_ = v_reuseFailAlloc_4368_;
goto v_reusejp_4366_;
}
v_reusejp_4366_:
{
v___y_4317_ = v___x_4347_;
v_result_4318_ = v___x_4367_;
v_charges_4319_ = v___x_4349_;
goto v___jp_4316_;
}
}
}
else
{
lean_object* v_a_4370_; lean_object* v___x_4371_; lean_object* v___x_4372_; lean_object* v_result_4373_; 
v_a_4370_ = lean_ctor_get(v_result_4361_, 0);
lean_inc(v_a_4370_);
lean_dec_ref_known(v_result_4361_, 1);
v___x_4371_ = lp_algalVerification_Algal_Expr_addValueBytes(v_a_4358_, v_a_4370_);
lean_dec(v_a_4370_);
lean_dec(v_a_4358_);
v___x_4372_ = lp_algalVerification_Algal_Expr_liftE___redArg(v___x_4371_);
v_result_4373_ = lean_ctor_get(v___x_4372_, 0);
lean_inc_ref(v_result_4373_);
lean_dec_ref(v___x_4372_);
if (lean_obj_tag(v_result_4373_) == 0)
{
lean_object* v_a_4374_; lean_object* v___x_4376_; uint8_t v_isShared_4377_; uint8_t v_isSharedCheck_4381_; 
lean_dec(v_a_4339_);
lean_del_object(v___x_4299_);
lean_dec(v_rest_4297_);
lean_dec_ref(v_key_4295_);
lean_del_object(v___x_4293_);
lean_dec(v_acc_4290_);
lean_dec(v_scope_2515_);
v_a_4374_ = lean_ctor_get(v_result_4373_, 0);
v_isSharedCheck_4381_ = !lean_is_exclusive(v_result_4373_);
if (v_isSharedCheck_4381_ == 0)
{
v___x_4376_ = v_result_4373_;
v_isShared_4377_ = v_isSharedCheck_4381_;
goto v_resetjp_4375_;
}
else
{
lean_inc(v_a_4374_);
lean_dec(v_result_4373_);
v___x_4376_ = lean_box(0);
v_isShared_4377_ = v_isSharedCheck_4381_;
goto v_resetjp_4375_;
}
v_resetjp_4375_:
{
lean_object* v___x_4379_; 
if (v_isShared_4377_ == 0)
{
v___x_4379_ = v___x_4376_;
goto v_reusejp_4378_;
}
else
{
lean_object* v_reuseFailAlloc_4380_; 
v_reuseFailAlloc_4380_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4380_, 0, v_a_4374_);
v___x_4379_ = v_reuseFailAlloc_4380_;
goto v_reusejp_4378_;
}
v_reusejp_4378_:
{
v___y_4323_ = v___x_4360_;
v___y_4324_ = v___x_4347_;
v_result_4325_ = v___x_4379_;
v_charges_4326_ = v___x_4349_;
goto v___jp_4322_;
}
}
}
else
{
lean_object* v_a_4382_; lean_object* v___x_4384_; 
v_a_4382_ = lean_ctor_get(v_result_4373_, 0);
lean_inc(v_a_4382_);
lean_dec_ref_known(v_result_4373_, 1);
if (v_isShared_4300_ == 0)
{
lean_ctor_set(v___x_4299_, 2, v_acc_4290_);
lean_ctor_set(v___x_4299_, 1, v_a_4339_);
v___x_4384_ = v___x_4299_;
goto v_reusejp_4383_;
}
else
{
lean_object* v_reuseFailAlloc_4392_; 
v_reuseFailAlloc_4392_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v_reuseFailAlloc_4392_, 0, v_key_4295_);
lean_ctor_set(v_reuseFailAlloc_4392_, 1, v_a_4339_);
lean_ctor_set(v_reuseFailAlloc_4392_, 2, v_acc_4290_);
v___x_4384_ = v_reuseFailAlloc_4392_;
goto v_reusejp_4383_;
}
v_reusejp_4383_:
{
lean_object* v___x_4386_; 
if (v_isShared_4294_ == 0)
{
lean_ctor_set(v___x_4293_, 2, v_a_4382_);
lean_ctor_set(v___x_4293_, 1, v___x_4384_);
lean_ctor_set(v___x_4293_, 0, v_rest_4297_);
v___x_4386_ = v___x_4293_;
goto v_reusejp_4385_;
}
else
{
lean_object* v_reuseFailAlloc_4391_; 
v_reuseFailAlloc_4391_ = lean_alloc_ctor(2, 3, 0);
lean_ctor_set(v_reuseFailAlloc_4391_, 0, v_rest_4297_);
lean_ctor_set(v_reuseFailAlloc_4391_, 1, v___x_4384_);
lean_ctor_set(v_reuseFailAlloc_4391_, 2, v_a_4382_);
v___x_4386_ = v_reuseFailAlloc_4391_;
goto v_reusejp_4385_;
}
v_reusejp_4385_:
{
lean_object* v___x_4387_; lean_object* v_result_4388_; lean_object* v_charges_4389_; lean_object* v___x_4390_; 
v___x_4387_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_4386_);
v_result_4388_ = lean_ctor_get(v___x_4387_, 0);
lean_inc_ref(v_result_4388_);
v_charges_4389_ = lean_ctor_get(v___x_4387_, 1);
lean_inc(v_charges_4389_);
lean_dec_ref(v___x_4387_);
v___x_4390_ = l_List_appendTR___redArg(v___x_4349_, v_charges_4389_);
v___y_4323_ = v___x_4360_;
v___y_4324_ = v___x_4347_;
v_result_4325_ = v_result_4388_;
v_charges_4326_ = v___x_4390_;
goto v___jp_4322_;
}
}
}
}
}
}
}
v___jp_4303_:
{
lean_object* v_charges_4306_; lean_object* v___x_4308_; uint8_t v_isShared_4309_; uint8_t v_isSharedCheck_4314_; 
v_charges_4306_ = lean_ctor_get(v___x_4302_, 1);
v_isSharedCheck_4314_ = !lean_is_exclusive(v___x_4302_);
if (v_isSharedCheck_4314_ == 0)
{
lean_object* v_unused_4315_; 
v_unused_4315_ = lean_ctor_get(v___x_4302_, 0);
lean_dec(v_unused_4315_);
v___x_4308_ = v___x_4302_;
v_isShared_4309_ = v_isSharedCheck_4314_;
goto v_resetjp_4307_;
}
else
{
lean_inc(v_charges_4306_);
lean_dec(v___x_4302_);
v___x_4308_ = lean_box(0);
v_isShared_4309_ = v_isSharedCheck_4314_;
goto v_resetjp_4307_;
}
v_resetjp_4307_:
{
lean_object* v___x_4310_; lean_object* v___x_4312_; 
v___x_4310_ = l_List_appendTR___redArg(v_charges_4306_, v_charges_4305_);
if (v_isShared_4309_ == 0)
{
lean_ctor_set(v___x_4308_, 1, v___x_4310_);
lean_ctor_set(v___x_4308_, 0, v_result_4304_);
v___x_4312_ = v___x_4308_;
goto v_reusejp_4311_;
}
else
{
lean_object* v_reuseFailAlloc_4313_; 
v_reuseFailAlloc_4313_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_4313_, 0, v_result_4304_);
lean_ctor_set(v_reuseFailAlloc_4313_, 1, v___x_4310_);
v___x_4312_ = v_reuseFailAlloc_4313_;
goto v_reusejp_4311_;
}
v_reusejp_4311_:
{
return v___x_4312_;
}
}
}
v___jp_4316_:
{
lean_object* v_charges_4320_; lean_object* v___x_4321_; 
v_charges_4320_ = lean_ctor_get(v___y_4317_, 1);
lean_inc(v_charges_4320_);
lean_dec_ref(v___y_4317_);
v___x_4321_ = l_List_appendTR___redArg(v_charges_4320_, v_charges_4319_);
v_result_4304_ = v_result_4318_;
v_charges_4305_ = v___x_4321_;
goto v___jp_4303_;
}
v___jp_4322_:
{
lean_object* v_charges_4327_; lean_object* v___x_4328_; 
v_charges_4327_ = lean_ctor_get(v___y_4323_, 1);
lean_inc(v_charges_4327_);
lean_dec_ref(v___y_4323_);
v___x_4328_ = l_List_appendTR___redArg(v_charges_4327_, v_charges_4326_);
v___y_4317_ = v___y_4324_;
v_result_4318_ = v_result_4325_;
v_charges_4319_ = v___x_4328_;
goto v___jp_4316_;
}
}
}
}
}
case 3:
{
lean_object* v_pending_4398_; 
v_pending_4398_ = lean_ctor_get(v_w_2516_, 1);
if (lean_obj_tag(v_pending_4398_) == 0)
{
uint8_t v_want_4399_; lean_object* v___x_4400_; lean_object* v___x_4401_; lean_object* v___x_4402_; lean_object* v___x_4403_; 
lean_dec(v_scope_2515_);
v_want_4399_ = lean_ctor_get_uint8(v_w_2516_, sizeof(void*)*3);
lean_dec_ref_known(v_w_2516_, 3);
v___x_4400_ = lean_alloc_ctor(1, 0, 1);
lean_ctor_set_uint8(v___x_4400_, 0, v_want_4399_);
v___x_4401_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_4401_, 0, v___x_4400_);
v___x_4402_ = lean_box(0);
v___x_4403_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_4403_, 0, v___x_4401_);
lean_ctor_set(v___x_4403_, 1, v___x_4402_);
return v___x_4403_;
}
else
{
uint8_t v_want_4404_; lean_object* v_op_4405_; lean_object* v_idx_4406_; lean_object* v___x_4408_; uint8_t v_isShared_4409_; uint8_t v_isSharedCheck_4457_; 
lean_inc_ref(v_pending_4398_);
v_want_4404_ = lean_ctor_get_uint8(v_w_2516_, sizeof(void*)*3);
v_op_4405_ = lean_ctor_get(v_w_2516_, 0);
v_idx_4406_ = lean_ctor_get(v_w_2516_, 2);
v_isSharedCheck_4457_ = !lean_is_exclusive(v_w_2516_);
if (v_isSharedCheck_4457_ == 0)
{
lean_object* v_unused_4458_; 
v_unused_4458_ = lean_ctor_get(v_w_2516_, 1);
lean_dec(v_unused_4458_);
v___x_4408_ = v_w_2516_;
v_isShared_4409_ = v_isSharedCheck_4457_;
goto v_resetjp_4407_;
}
else
{
lean_inc(v_idx_4406_);
lean_inc(v_op_4405_);
lean_dec(v_w_2516_);
v___x_4408_ = lean_box(0);
v_isShared_4409_ = v_isSharedCheck_4457_;
goto v_resetjp_4407_;
}
v_resetjp_4407_:
{
lean_object* v_value_4410_; lean_object* v_rest_4411_; lean_object* v___x_4412_; lean_object* v___x_4413_; lean_object* v_result_4415_; lean_object* v_charges_4416_; lean_object* v___y_4428_; lean_object* v_result_4438_; lean_object* v_charges_4439_; 
v_value_4410_ = lean_ctor_get(v_pending_4398_, 0);
lean_inc(v_value_4410_);
v_rest_4411_ = lean_ctor_get(v_pending_4398_, 1);
lean_inc(v_rest_4411_);
lean_dec_ref_known(v_pending_4398_, 2);
v___x_4412_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_4412_, 0, v_value_4410_);
lean_inc(v_scope_2515_);
v___x_4413_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_4412_);
v_result_4438_ = lean_ctor_get(v___x_4413_, 0);
lean_inc_ref(v_result_4438_);
v_charges_4439_ = lean_ctor_get(v___x_4413_, 1);
lean_inc(v_charges_4439_);
if (lean_obj_tag(v_result_4438_) == 0)
{
lean_object* v___x_4443_; uint8_t v_isShared_4444_; uint8_t v_isSharedCheck_4448_; 
lean_dec(v_rest_4411_);
lean_del_object(v___x_4408_);
lean_dec(v_idx_4406_);
lean_dec_ref(v_op_4405_);
lean_dec(v_scope_2515_);
v_isSharedCheck_4448_ = !lean_is_exclusive(v___x_4413_);
if (v_isSharedCheck_4448_ == 0)
{
lean_object* v_unused_4449_; lean_object* v_unused_4450_; 
v_unused_4449_ = lean_ctor_get(v___x_4413_, 1);
lean_dec(v_unused_4449_);
v_unused_4450_ = lean_ctor_get(v___x_4413_, 0);
lean_dec(v_unused_4450_);
v___x_4443_ = v___x_4413_;
v_isShared_4444_ = v_isSharedCheck_4448_;
goto v_resetjp_4442_;
}
else
{
lean_dec(v___x_4413_);
v___x_4443_ = lean_box(0);
v_isShared_4444_ = v_isSharedCheck_4448_;
goto v_resetjp_4442_;
}
v_resetjp_4442_:
{
lean_object* v___x_4446_; 
if (v_isShared_4444_ == 0)
{
v___x_4446_ = v___x_4443_;
goto v_reusejp_4445_;
}
else
{
lean_object* v_reuseFailAlloc_4447_; 
v_reuseFailAlloc_4447_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_4447_, 0, v_result_4438_);
lean_ctor_set(v_reuseFailAlloc_4447_, 1, v_charges_4439_);
v___x_4446_ = v_reuseFailAlloc_4447_;
goto v_reusejp_4445_;
}
v_reusejp_4445_:
{
return v___x_4446_;
}
}
}
else
{
lean_object* v_a_4451_; 
lean_dec(v_charges_4439_);
v_a_4451_ = lean_ctor_get(v_result_4438_, 0);
if (lean_obj_tag(v_a_4451_) == 1)
{
uint8_t v_value_4452_; 
v_value_4452_ = lean_ctor_get_uint8(v_a_4451_, 0);
if (v_value_4452_ == 0)
{
if (v_want_4404_ == 0)
{
lean_dec_ref_known(v_result_4438_, 1);
goto v___jp_4431_;
}
else
{
lean_dec(v_rest_4411_);
lean_del_object(v___x_4408_);
lean_dec(v_idx_4406_);
lean_dec_ref(v_op_4405_);
lean_dec(v_scope_2515_);
goto v___jp_4440_;
}
}
else
{
if (v_want_4404_ == 0)
{
lean_dec(v_rest_4411_);
lean_del_object(v___x_4408_);
lean_dec(v_idx_4406_);
lean_dec_ref(v_op_4405_);
lean_dec(v_scope_2515_);
goto v___jp_4440_;
}
else
{
lean_dec_ref_known(v_result_4438_, 1);
goto v___jp_4431_;
}
}
}
else
{
lean_object* v___x_4453_; lean_object* v___x_4454_; lean_object* v___x_4455_; lean_object* v___x_4456_; 
lean_inc(v_a_4451_);
lean_dec_ref_known(v_result_4438_, 1);
lean_dec(v_rest_4411_);
lean_del_object(v___x_4408_);
lean_dec(v_scope_2515_);
v___x_4453_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asBool___closed__0));
v___x_4454_ = lp_algalVerification_Algal_Expr_kindOf(v_a_4451_);
lean_dec(v_a_4451_);
v___x_4455_ = lp_algalVerification_Algal_Expr_errType(v_op_4405_, v_idx_4406_, v___x_4453_, v___x_4454_);
v___x_4456_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_4455_);
v___y_4428_ = v___x_4456_;
goto v___jp_4427_;
}
}
v___jp_4414_:
{
lean_object* v_charges_4417_; lean_object* v___x_4419_; uint8_t v_isShared_4420_; uint8_t v_isSharedCheck_4425_; 
v_charges_4417_ = lean_ctor_get(v___x_4413_, 1);
v_isSharedCheck_4425_ = !lean_is_exclusive(v___x_4413_);
if (v_isSharedCheck_4425_ == 0)
{
lean_object* v_unused_4426_; 
v_unused_4426_ = lean_ctor_get(v___x_4413_, 0);
lean_dec(v_unused_4426_);
v___x_4419_ = v___x_4413_;
v_isShared_4420_ = v_isSharedCheck_4425_;
goto v_resetjp_4418_;
}
else
{
lean_inc(v_charges_4417_);
lean_dec(v___x_4413_);
v___x_4419_ = lean_box(0);
v_isShared_4420_ = v_isSharedCheck_4425_;
goto v_resetjp_4418_;
}
v_resetjp_4418_:
{
lean_object* v___x_4421_; lean_object* v___x_4423_; 
v___x_4421_ = l_List_appendTR___redArg(v_charges_4417_, v_charges_4416_);
if (v_isShared_4420_ == 0)
{
lean_ctor_set(v___x_4419_, 1, v___x_4421_);
lean_ctor_set(v___x_4419_, 0, v_result_4415_);
v___x_4423_ = v___x_4419_;
goto v_reusejp_4422_;
}
else
{
lean_object* v_reuseFailAlloc_4424_; 
v_reuseFailAlloc_4424_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_4424_, 0, v_result_4415_);
lean_ctor_set(v_reuseFailAlloc_4424_, 1, v___x_4421_);
v___x_4423_ = v_reuseFailAlloc_4424_;
goto v_reusejp_4422_;
}
v_reusejp_4422_:
{
return v___x_4423_;
}
}
}
v___jp_4427_:
{
lean_object* v_result_4429_; lean_object* v_charges_4430_; 
v_result_4429_ = lean_ctor_get(v___y_4428_, 0);
lean_inc_ref(v_result_4429_);
v_charges_4430_ = lean_ctor_get(v___y_4428_, 1);
lean_inc(v_charges_4430_);
lean_dec_ref(v___y_4428_);
v_result_4415_ = v_result_4429_;
v_charges_4416_ = v_charges_4430_;
goto v___jp_4414_;
}
v___jp_4431_:
{
lean_object* v___x_4432_; lean_object* v___x_4433_; lean_object* v___x_4435_; 
v___x_4432_ = lean_unsigned_to_nat(1u);
v___x_4433_ = lean_nat_add(v_idx_4406_, v___x_4432_);
lean_dec(v_idx_4406_);
if (v_isShared_4409_ == 0)
{
lean_ctor_set(v___x_4408_, 2, v___x_4433_);
lean_ctor_set(v___x_4408_, 1, v_rest_4411_);
v___x_4435_ = v___x_4408_;
goto v_reusejp_4434_;
}
else
{
lean_object* v_reuseFailAlloc_4437_; 
v_reuseFailAlloc_4437_ = lean_alloc_ctor(3, 3, 1);
lean_ctor_set(v_reuseFailAlloc_4437_, 0, v_op_4405_);
lean_ctor_set(v_reuseFailAlloc_4437_, 1, v_rest_4411_);
lean_ctor_set(v_reuseFailAlloc_4437_, 2, v___x_4433_);
lean_ctor_set_uint8(v_reuseFailAlloc_4437_, sizeof(void*)*3, v_want_4404_);
v___x_4435_ = v_reuseFailAlloc_4437_;
goto v_reusejp_4434_;
}
v_reusejp_4434_:
{
lean_object* v___x_4436_; 
v___x_4436_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_4435_);
v___y_4428_ = v___x_4436_;
goto v___jp_4427_;
}
}
v___jp_4440_:
{
lean_object* v___x_4441_; 
v___x_4441_ = lean_box(0);
v_result_4415_ = v_result_4438_;
v_charges_4416_ = v___x_4441_;
goto v___jp_4414_;
}
}
}
}
case 4:
{
lean_object* v_pending_4459_; 
v_pending_4459_ = lean_ctor_get(v_w_2516_, 2);
if (lean_obj_tag(v_pending_4459_) == 0)
{
lean_object* v_cur_4460_; lean_object* v___x_4461_; lean_object* v___x_4462_; lean_object* v___x_4463_; 
lean_dec(v_scope_2515_);
v_cur_4460_ = lean_ctor_get(v_w_2516_, 1);
lean_inc(v_cur_4460_);
lean_dec_ref_known(v_w_2516_, 4);
v___x_4461_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_4461_, 0, v_cur_4460_);
v___x_4462_ = lean_box(0);
v___x_4463_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_4463_, 0, v___x_4461_);
lean_ctor_set(v___x_4463_, 1, v___x_4462_);
return v___x_4463_;
}
else
{
lean_object* v_op_4464_; lean_object* v_cur_4465_; lean_object* v_step_4466_; lean_object* v___x_4468_; uint8_t v_isShared_4469_; uint8_t v_isSharedCheck_4545_; 
lean_inc_ref(v_pending_4459_);
v_op_4464_ = lean_ctor_get(v_w_2516_, 0);
v_cur_4465_ = lean_ctor_get(v_w_2516_, 1);
v_step_4466_ = lean_ctor_get(v_w_2516_, 3);
v_isSharedCheck_4545_ = !lean_is_exclusive(v_w_2516_);
if (v_isSharedCheck_4545_ == 0)
{
lean_object* v_unused_4546_; 
v_unused_4546_ = lean_ctor_get(v_w_2516_, 2);
lean_dec(v_unused_4546_);
v___x_4468_ = v_w_2516_;
v_isShared_4469_ = v_isSharedCheck_4545_;
goto v_resetjp_4467_;
}
else
{
lean_inc(v_step_4466_);
lean_inc(v_cur_4465_);
lean_inc(v_op_4464_);
lean_dec(v_w_2516_);
v___x_4468_ = lean_box(0);
v_isShared_4469_ = v_isSharedCheck_4545_;
goto v_resetjp_4467_;
}
v_resetjp_4467_:
{
lean_object* v_value_4470_; lean_object* v_rest_4471_; lean_object* v___x_4472_; lean_object* v___x_4473_; lean_object* v_result_4475_; lean_object* v_charges_4476_; lean_object* v___y_4488_; lean_object* v_result_4496_; 
v_value_4470_ = lean_ctor_get(v_pending_4459_, 0);
lean_inc(v_value_4470_);
v_rest_4471_ = lean_ctor_get(v_pending_4459_, 1);
lean_inc(v_rest_4471_);
lean_dec_ref_known(v_pending_4459_, 2);
v___x_4472_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_4472_, 0, v_value_4470_);
lean_inc(v_scope_2515_);
v___x_4473_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_4472_);
v_result_4496_ = lean_ctor_get(v___x_4473_, 0);
lean_inc_ref(v_result_4496_);
if (lean_obj_tag(v_result_4496_) == 0)
{
lean_object* v_charges_4497_; lean_object* v___x_4499_; uint8_t v_isShared_4500_; uint8_t v_isSharedCheck_4504_; 
lean_dec(v_rest_4471_);
lean_del_object(v___x_4468_);
lean_dec(v_step_4466_);
lean_dec(v_cur_4465_);
lean_dec_ref(v_op_4464_);
lean_dec(v_scope_2515_);
v_charges_4497_ = lean_ctor_get(v___x_4473_, 1);
v_isSharedCheck_4504_ = !lean_is_exclusive(v___x_4473_);
if (v_isSharedCheck_4504_ == 0)
{
lean_object* v_unused_4505_; 
v_unused_4505_ = lean_ctor_get(v___x_4473_, 0);
lean_dec(v_unused_4505_);
v___x_4499_ = v___x_4473_;
v_isShared_4500_ = v_isSharedCheck_4504_;
goto v_resetjp_4498_;
}
else
{
lean_inc(v_charges_4497_);
lean_dec(v___x_4473_);
v___x_4499_ = lean_box(0);
v_isShared_4500_ = v_isSharedCheck_4504_;
goto v_resetjp_4498_;
}
v_resetjp_4498_:
{
lean_object* v___x_4502_; 
if (v_isShared_4500_ == 0)
{
v___x_4502_ = v___x_4499_;
goto v_reusejp_4501_;
}
else
{
lean_object* v_reuseFailAlloc_4503_; 
v_reuseFailAlloc_4503_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_4503_, 0, v_result_4496_);
lean_ctor_set(v_reuseFailAlloc_4503_, 1, v_charges_4497_);
v___x_4502_ = v_reuseFailAlloc_4503_;
goto v_reusejp_4501_;
}
v_reusejp_4501_:
{
return v___x_4502_;
}
}
}
else
{
lean_object* v_a_4506_; 
v_a_4506_ = lean_ctor_get(v_result_4496_, 0);
lean_inc(v_a_4506_);
lean_dec_ref_known(v_result_4496_, 1);
switch(lean_obj_tag(v_a_4506_))
{
case 3:
{
if (lean_obj_tag(v_cur_4465_) == 5)
{
lean_object* v_value_4507_; lean_object* v_fields_4508_; lean_object* v___x_4509_; 
v_value_4507_ = lean_ctor_get(v_a_4506_, 0);
lean_inc_ref(v_value_4507_);
lean_dec_ref_known(v_a_4506_, 1);
v_fields_4508_ = lean_ctor_get(v_cur_4465_, 0);
lean_inc(v_fields_4508_);
lean_dec_ref_known(v_cur_4465_, 1);
v___x_4509_ = lp_algalVerification_Algal_Core_Normalize_lookupFields(v_fields_4508_, v_value_4507_);
lean_dec_ref(v_value_4507_);
lean_dec(v_fields_4508_);
if (lean_obj_tag(v___x_4509_) == 0)
{
lean_object* v___x_4510_; lean_object* v___x_4511_; 
lean_dec(v_rest_4471_);
lean_del_object(v___x_4468_);
lean_dec(v_step_4466_);
lean_dec_ref(v_op_4464_);
lean_dec(v_scope_2515_);
v___x_4510_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__50));
v___x_4511_ = lean_box(0);
v_result_4475_ = v___x_4510_;
v_charges_4476_ = v___x_4511_;
goto v___jp_4474_;
}
else
{
lean_object* v_val_4512_; lean_object* v___x_4513_; lean_object* v___x_4514_; lean_object* v___x_4516_; 
v_val_4512_ = lean_ctor_get(v___x_4509_, 0);
lean_inc(v_val_4512_);
lean_dec_ref_known(v___x_4509_, 1);
v___x_4513_ = lean_unsigned_to_nat(1u);
v___x_4514_ = lean_nat_add(v_step_4466_, v___x_4513_);
lean_dec(v_step_4466_);
if (v_isShared_4469_ == 0)
{
lean_ctor_set(v___x_4468_, 3, v___x_4514_);
lean_ctor_set(v___x_4468_, 2, v_rest_4471_);
lean_ctor_set(v___x_4468_, 1, v_val_4512_);
v___x_4516_ = v___x_4468_;
goto v_reusejp_4515_;
}
else
{
lean_object* v_reuseFailAlloc_4518_; 
v_reuseFailAlloc_4518_ = lean_alloc_ctor(4, 4, 0);
lean_ctor_set(v_reuseFailAlloc_4518_, 0, v_op_4464_);
lean_ctor_set(v_reuseFailAlloc_4518_, 1, v_val_4512_);
lean_ctor_set(v_reuseFailAlloc_4518_, 2, v_rest_4471_);
lean_ctor_set(v_reuseFailAlloc_4518_, 3, v___x_4514_);
v___x_4516_ = v_reuseFailAlloc_4518_;
goto v_reusejp_4515_;
}
v_reusejp_4515_:
{
lean_object* v___x_4517_; 
v___x_4517_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_4516_);
v___y_4488_ = v___x_4517_;
goto v___jp_4487_;
}
}
}
else
{
lean_object* v___x_4519_; lean_object* v___x_4520_; 
lean_dec_ref_known(v_a_4506_, 1);
lean_dec(v_rest_4471_);
lean_del_object(v___x_4468_);
lean_dec(v_step_4466_);
lean_dec(v_cur_4465_);
lean_dec_ref(v_op_4464_);
lean_dec(v_scope_2515_);
v___x_4519_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__50));
v___x_4520_ = lean_box(0);
v_result_4475_ = v___x_4519_;
v_charges_4476_ = v___x_4520_;
goto v___jp_4474_;
}
}
case 2:
{
uint64_t v_value_4521_; double v___x_4522_; double v___x_4523_; uint8_t v___x_4524_; 
v_value_4521_ = lean_ctor_get_uint64(v_a_4506_, 0);
lean_dec_ref_known(v_a_4506_, 0);
v___x_4522_ = lean_float_of_bits(v_value_4521_);
v___x_4523_ = lean_float_once(&lp_algalVerification_Algal_Expr_asIndex___closed__1, &lp_algalVerification_Algal_Expr_asIndex___closed__1_once, _init_lp_algalVerification_Algal_Expr_asIndex___closed__1);
v___x_4524_ = lean_float_decLt(v___x_4522_, v___x_4523_);
if (v___x_4524_ == 0)
{
double v___x_4525_; double v___x_4526_; uint8_t v___x_4527_; 
v___x_4525_ = floor(v___x_4522_);
v___x_4526_ = lean_float_sub(v___x_4522_, v___x_4525_);
v___x_4527_ = lean_float_beq(v___x_4526_, v___x_4523_);
if (v___x_4527_ == 0)
{
lean_dec(v_rest_4471_);
lean_del_object(v___x_4468_);
lean_dec(v_cur_4465_);
lean_dec(v_scope_2515_);
goto v___jp_4491_;
}
else
{
if (lean_obj_tag(v_cur_4465_) == 4)
{
lean_object* v_values_4528_; lean_object* v___x_4529_; 
v_values_4528_ = lean_ctor_get(v_cur_4465_, 0);
lean_inc(v_values_4528_);
lean_dec_ref_known(v_cur_4465_, 1);
v___x_4529_ = lp_algalVerification_Algal_Expr_itemsGetF(v_values_4528_, v___x_4522_);
lean_dec(v_values_4528_);
if (lean_obj_tag(v___x_4529_) == 0)
{
lean_object* v___x_4530_; lean_object* v___x_4531_; 
lean_dec(v_rest_4471_);
lean_del_object(v___x_4468_);
lean_dec(v_step_4466_);
lean_dec_ref(v_op_4464_);
lean_dec(v_scope_2515_);
v___x_4530_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__50));
v___x_4531_ = lean_box(0);
v_result_4475_ = v___x_4530_;
v_charges_4476_ = v___x_4531_;
goto v___jp_4474_;
}
else
{
lean_object* v_val_4532_; lean_object* v___x_4533_; lean_object* v___x_4534_; lean_object* v___x_4536_; 
v_val_4532_ = lean_ctor_get(v___x_4529_, 0);
lean_inc(v_val_4532_);
lean_dec_ref_known(v___x_4529_, 1);
v___x_4533_ = lean_unsigned_to_nat(1u);
v___x_4534_ = lean_nat_add(v_step_4466_, v___x_4533_);
lean_dec(v_step_4466_);
if (v_isShared_4469_ == 0)
{
lean_ctor_set(v___x_4468_, 3, v___x_4534_);
lean_ctor_set(v___x_4468_, 2, v_rest_4471_);
lean_ctor_set(v___x_4468_, 1, v_val_4532_);
v___x_4536_ = v___x_4468_;
goto v_reusejp_4535_;
}
else
{
lean_object* v_reuseFailAlloc_4538_; 
v_reuseFailAlloc_4538_ = lean_alloc_ctor(4, 4, 0);
lean_ctor_set(v_reuseFailAlloc_4538_, 0, v_op_4464_);
lean_ctor_set(v_reuseFailAlloc_4538_, 1, v_val_4532_);
lean_ctor_set(v_reuseFailAlloc_4538_, 2, v_rest_4471_);
lean_ctor_set(v_reuseFailAlloc_4538_, 3, v___x_4534_);
v___x_4536_ = v_reuseFailAlloc_4538_;
goto v_reusejp_4535_;
}
v_reusejp_4535_:
{
lean_object* v___x_4537_; 
v___x_4537_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_4536_);
v___y_4488_ = v___x_4537_;
goto v___jp_4487_;
}
}
}
else
{
lean_object* v___x_4539_; lean_object* v___x_4540_; 
lean_dec(v_rest_4471_);
lean_del_object(v___x_4468_);
lean_dec(v_step_4466_);
lean_dec(v_cur_4465_);
lean_dec_ref(v_op_4464_);
lean_dec(v_scope_2515_);
v___x_4539_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__50));
v___x_4540_ = lean_box(0);
v_result_4475_ = v___x_4539_;
v_charges_4476_ = v___x_4540_;
goto v___jp_4474_;
}
}
}
else
{
lean_dec(v_rest_4471_);
lean_del_object(v___x_4468_);
lean_dec(v_cur_4465_);
lean_dec(v_scope_2515_);
goto v___jp_4491_;
}
}
default: 
{
lean_object* v___x_4541_; lean_object* v___x_4542_; lean_object* v___x_4543_; lean_object* v___x_4544_; 
lean_dec(v_rest_4471_);
lean_del_object(v___x_4468_);
lean_dec(v_cur_4465_);
lean_dec(v_scope_2515_);
v___x_4541_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__51));
v___x_4542_ = lp_algalVerification_Algal_Expr_kindOf(v_a_4506_);
lean_dec(v_a_4506_);
v___x_4543_ = lp_algalVerification_Algal_Expr_errType(v_op_4464_, v_step_4466_, v___x_4541_, v___x_4542_);
v___x_4544_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_4543_);
v___y_4488_ = v___x_4544_;
goto v___jp_4487_;
}
}
}
v___jp_4474_:
{
lean_object* v_charges_4477_; lean_object* v___x_4479_; uint8_t v_isShared_4480_; uint8_t v_isSharedCheck_4485_; 
v_charges_4477_ = lean_ctor_get(v___x_4473_, 1);
v_isSharedCheck_4485_ = !lean_is_exclusive(v___x_4473_);
if (v_isSharedCheck_4485_ == 0)
{
lean_object* v_unused_4486_; 
v_unused_4486_ = lean_ctor_get(v___x_4473_, 0);
lean_dec(v_unused_4486_);
v___x_4479_ = v___x_4473_;
v_isShared_4480_ = v_isSharedCheck_4485_;
goto v_resetjp_4478_;
}
else
{
lean_inc(v_charges_4477_);
lean_dec(v___x_4473_);
v___x_4479_ = lean_box(0);
v_isShared_4480_ = v_isSharedCheck_4485_;
goto v_resetjp_4478_;
}
v_resetjp_4478_:
{
lean_object* v___x_4481_; lean_object* v___x_4483_; 
v___x_4481_ = l_List_appendTR___redArg(v_charges_4477_, v_charges_4476_);
if (v_isShared_4480_ == 0)
{
lean_ctor_set(v___x_4479_, 1, v___x_4481_);
lean_ctor_set(v___x_4479_, 0, v_result_4475_);
v___x_4483_ = v___x_4479_;
goto v_reusejp_4482_;
}
else
{
lean_object* v_reuseFailAlloc_4484_; 
v_reuseFailAlloc_4484_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_4484_, 0, v_result_4475_);
lean_ctor_set(v_reuseFailAlloc_4484_, 1, v___x_4481_);
v___x_4483_ = v_reuseFailAlloc_4484_;
goto v_reusejp_4482_;
}
v_reusejp_4482_:
{
return v___x_4483_;
}
}
}
v___jp_4487_:
{
lean_object* v_result_4489_; lean_object* v_charges_4490_; 
v_result_4489_ = lean_ctor_get(v___y_4488_, 0);
lean_inc_ref(v_result_4489_);
v_charges_4490_ = lean_ctor_get(v___y_4488_, 1);
lean_inc(v_charges_4490_);
lean_dec_ref(v___y_4488_);
v_result_4475_ = v_result_4489_;
v_charges_4476_ = v_charges_4490_;
goto v___jp_4474_;
}
v___jp_4491_:
{
lean_object* v___x_4492_; lean_object* v___x_4493_; lean_object* v___x_4494_; lean_object* v___x_4495_; 
v___x_4492_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___closed__49));
v___x_4493_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asNum___closed__0));
v___x_4494_ = lp_algalVerification_Algal_Expr_errType(v_op_4464_, v_step_4466_, v___x_4492_, v___x_4493_);
v___x_4495_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_4494_);
v___y_4488_ = v___x_4495_;
goto v___jp_4487_;
}
}
}
}
case 5:
{
lean_object* v_pending_4547_; 
v_pending_4547_ = lean_ctor_get(v_w_2516_, 3);
lean_inc(v_pending_4547_);
if (lean_obj_tag(v_pending_4547_) == 0)
{
lean_object* v_acc_4548_; lean_object* v___x_4549_; lean_object* v___x_4550_; lean_object* v___x_4551_; lean_object* v___x_4552_; lean_object* v___x_4553_; 
lean_dec(v_scope_2515_);
v_acc_4548_ = lean_ctor_get(v_w_2516_, 4);
lean_inc(v_acc_4548_);
lean_dec_ref_known(v_w_2516_, 7);
v___x_4549_ = lp_algalVerification_Algal_Expr_itemsReverse(v_acc_4548_);
v___x_4550_ = lean_alloc_ctor(4, 1, 0);
lean_ctor_set(v___x_4550_, 0, v___x_4549_);
v___x_4551_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_4551_, 0, v___x_4550_);
v___x_4552_ = lean_box(0);
v___x_4553_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_4553_, 0, v___x_4551_);
lean_ctor_set(v___x_4553_, 1, v___x_4552_);
return v___x_4553_;
}
else
{
uint8_t v_isMap_4554_; lean_object* v_op_4555_; lean_object* v_name_4556_; lean_object* v_body_4557_; lean_object* v_acc_4558_; lean_object* v_bytes_4559_; lean_object* v_idx_4560_; lean_object* v___x_4562_; uint8_t v_isShared_4563_; uint8_t v_isSharedCheck_4711_; 
v_isMap_4554_ = lean_ctor_get_uint8(v_w_2516_, sizeof(void*)*7);
v_op_4555_ = lean_ctor_get(v_w_2516_, 0);
v_name_4556_ = lean_ctor_get(v_w_2516_, 1);
v_body_4557_ = lean_ctor_get(v_w_2516_, 2);
v_acc_4558_ = lean_ctor_get(v_w_2516_, 4);
v_bytes_4559_ = lean_ctor_get(v_w_2516_, 5);
v_idx_4560_ = lean_ctor_get(v_w_2516_, 6);
v_isSharedCheck_4711_ = !lean_is_exclusive(v_w_2516_);
if (v_isSharedCheck_4711_ == 0)
{
lean_object* v_unused_4712_; 
v_unused_4712_ = lean_ctor_get(v_w_2516_, 3);
lean_dec(v_unused_4712_);
v___x_4562_ = v_w_2516_;
v_isShared_4563_ = v_isSharedCheck_4711_;
goto v_resetjp_4561_;
}
else
{
lean_inc(v_idx_4560_);
lean_inc(v_bytes_4559_);
lean_inc(v_acc_4558_);
lean_inc(v_body_4557_);
lean_inc(v_name_4556_);
lean_inc(v_op_4555_);
lean_dec(v_w_2516_);
v___x_4562_ = lean_box(0);
v_isShared_4563_ = v_isSharedCheck_4711_;
goto v_resetjp_4561_;
}
v_resetjp_4561_:
{
lean_object* v_value_4564_; lean_object* v_rest_4565_; lean_object* v___x_4567_; uint8_t v_isShared_4568_; uint8_t v_isSharedCheck_4710_; 
v_value_4564_ = lean_ctor_get(v_pending_4547_, 0);
v_rest_4565_ = lean_ctor_get(v_pending_4547_, 1);
v_isSharedCheck_4710_ = !lean_is_exclusive(v_pending_4547_);
if (v_isSharedCheck_4710_ == 0)
{
v___x_4567_ = v_pending_4547_;
v_isShared_4568_ = v_isSharedCheck_4710_;
goto v_resetjp_4566_;
}
else
{
lean_inc(v_rest_4565_);
lean_inc(v_value_4564_);
lean_dec(v_pending_4547_);
v___x_4567_ = lean_box(0);
v_isShared_4568_ = v_isSharedCheck_4710_;
goto v_resetjp_4566_;
}
v_resetjp_4566_:
{
lean_object* v___x_4569_; lean_object* v___x_4570_; lean_object* v_result_4572_; lean_object* v_charges_4573_; lean_object* v___x_4577_; lean_object* v___x_4578_; lean_object* v___x_4579_; lean_object* v___x_4580_; lean_object* v_result_4582_; lean_object* v_charges_4583_; lean_object* v___y_4587_; lean_object* v_result_4590_; 
v___x_4569_ = lean_unsigned_to_nat(1u);
v___x_4570_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___closed__0, &lp_algalVerification_Algal_Expr_machine___closed__0_once, _init_lp_algalVerification_Algal_Expr_machine___closed__0);
lean_inc(v_value_4564_);
lean_inc_ref(v_name_4556_);
v___x_4577_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_4577_, 0, v_name_4556_);
lean_ctor_set(v___x_4577_, 1, v_value_4564_);
lean_inc(v_scope_2515_);
v___x_4578_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_4578_, 0, v___x_4577_);
lean_ctor_set(v___x_4578_, 1, v_scope_2515_);
lean_inc(v_body_4557_);
v___x_4579_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_4579_, 0, v_body_4557_);
v___x_4580_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v___x_4578_, v___x_4579_);
v_result_4590_ = lean_ctor_get(v___x_4580_, 0);
lean_inc_ref(v_result_4590_);
if (lean_obj_tag(v_result_4590_) == 0)
{
lean_object* v_charges_4591_; 
lean_del_object(v___x_4567_);
lean_dec(v_rest_4565_);
lean_dec(v_value_4564_);
lean_del_object(v___x_4562_);
lean_dec(v_idx_4560_);
lean_dec(v_bytes_4559_);
lean_dec(v_acc_4558_);
lean_dec(v_body_4557_);
lean_dec_ref(v_name_4556_);
lean_dec_ref(v_op_4555_);
lean_dec(v_scope_2515_);
v_charges_4591_ = lean_ctor_get(v___x_4580_, 1);
lean_inc(v_charges_4591_);
lean_dec_ref(v___x_4580_);
v_result_4572_ = v_result_4590_;
v_charges_4573_ = v_charges_4591_;
goto v___jp_4571_;
}
else
{
if (v_isMap_4554_ == 0)
{
lean_object* v_a_4592_; 
v_a_4592_ = lean_ctor_get(v_result_4590_, 0);
lean_inc(v_a_4592_);
lean_dec_ref_known(v_result_4590_, 1);
if (lean_obj_tag(v_a_4592_) == 1)
{
uint8_t v_value_4593_; 
v_value_4593_ = lean_ctor_get_uint8(v_a_4592_, 0);
lean_dec_ref_known(v_a_4592_, 0);
if (v_value_4593_ == 0)
{
lean_object* v___x_4594_; lean_object* v___x_4596_; 
lean_del_object(v___x_4567_);
lean_dec(v_value_4564_);
v___x_4594_ = lean_nat_add(v_idx_4560_, v___x_4569_);
lean_dec(v_idx_4560_);
if (v_isShared_4563_ == 0)
{
lean_ctor_set(v___x_4562_, 6, v___x_4594_);
lean_ctor_set(v___x_4562_, 3, v_rest_4565_);
v___x_4596_ = v___x_4562_;
goto v_reusejp_4595_;
}
else
{
lean_object* v_reuseFailAlloc_4598_; 
v_reuseFailAlloc_4598_ = lean_alloc_ctor(5, 7, 1);
lean_ctor_set(v_reuseFailAlloc_4598_, 0, v_op_4555_);
lean_ctor_set(v_reuseFailAlloc_4598_, 1, v_name_4556_);
lean_ctor_set(v_reuseFailAlloc_4598_, 2, v_body_4557_);
lean_ctor_set(v_reuseFailAlloc_4598_, 3, v_rest_4565_);
lean_ctor_set(v_reuseFailAlloc_4598_, 4, v_acc_4558_);
lean_ctor_set(v_reuseFailAlloc_4598_, 5, v_bytes_4559_);
lean_ctor_set(v_reuseFailAlloc_4598_, 6, v___x_4594_);
lean_ctor_set_uint8(v_reuseFailAlloc_4598_, sizeof(void*)*7, v_isMap_4554_);
v___x_4596_ = v_reuseFailAlloc_4598_;
goto v_reusejp_4595_;
}
v_reusejp_4595_:
{
lean_object* v___x_4597_; 
v___x_4597_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_4596_);
v___y_4587_ = v___x_4597_;
goto v___jp_4586_;
}
}
else
{
lean_object* v___x_4599_; lean_object* v___x_4600_; lean_object* v_result_4602_; lean_object* v_charges_4603_; lean_object* v___y_4607_; lean_object* v___y_4608_; lean_object* v_result_4613_; lean_object* v___x_4614_; 
lean_inc(v_value_4564_);
v___x_4599_ = lp_algalVerification_Algal_Expr_valueBytes(v_value_4564_, v___x_4569_);
v___x_4600_ = lp_algalVerification_Algal_Expr_liftE___redArg(v___x_4599_);
v_result_4613_ = lean_ctor_get(v___x_4600_, 0);
lean_inc_ref(v_result_4613_);
lean_dec_ref(v___x_4600_);
v___x_4614_ = lean_box(0);
if (lean_obj_tag(v_result_4613_) == 0)
{
lean_object* v_a_4615_; lean_object* v___x_4617_; uint8_t v_isShared_4618_; uint8_t v_isSharedCheck_4622_; 
lean_del_object(v___x_4567_);
lean_dec(v_rest_4565_);
lean_dec(v_value_4564_);
lean_del_object(v___x_4562_);
lean_dec(v_idx_4560_);
lean_dec(v_bytes_4559_);
lean_dec(v_acc_4558_);
lean_dec(v_body_4557_);
lean_dec_ref(v_name_4556_);
lean_dec_ref(v_op_4555_);
lean_dec(v_scope_2515_);
v_a_4615_ = lean_ctor_get(v_result_4613_, 0);
v_isSharedCheck_4622_ = !lean_is_exclusive(v_result_4613_);
if (v_isSharedCheck_4622_ == 0)
{
v___x_4617_ = v_result_4613_;
v_isShared_4618_ = v_isSharedCheck_4622_;
goto v_resetjp_4616_;
}
else
{
lean_inc(v_a_4615_);
lean_dec(v_result_4613_);
v___x_4617_ = lean_box(0);
v_isShared_4618_ = v_isSharedCheck_4622_;
goto v_resetjp_4616_;
}
v_resetjp_4616_:
{
lean_object* v___x_4620_; 
if (v_isShared_4618_ == 0)
{
v___x_4620_ = v___x_4617_;
goto v_reusejp_4619_;
}
else
{
lean_object* v_reuseFailAlloc_4621_; 
v_reuseFailAlloc_4621_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4621_, 0, v_a_4615_);
v___x_4620_ = v_reuseFailAlloc_4621_;
goto v_reusejp_4619_;
}
v_reusejp_4619_:
{
v_result_4582_ = v___x_4620_;
v_charges_4583_ = v___x_4614_;
goto v___jp_4581_;
}
}
}
else
{
lean_object* v_a_4623_; lean_object* v___y_4625_; 
v_a_4623_ = lean_ctor_get(v_result_4613_, 0);
lean_inc(v_a_4623_);
lean_dec_ref_known(v_result_4613_, 1);
if (lean_obj_tag(v_acc_4558_) == 0)
{
lean_object* v___x_4651_; 
v___x_4651_ = lean_unsigned_to_nat(0u);
v___y_4625_ = v___x_4651_;
goto v___jp_4624_;
}
else
{
v___y_4625_ = v___x_4569_;
goto v___jp_4624_;
}
v___jp_4624_:
{
lean_object* v___x_4626_; lean_object* v___x_4627_; lean_object* v___x_4628_; lean_object* v_result_4629_; 
v___x_4626_ = lean_nat_add(v_a_4623_, v___y_4625_);
lean_dec(v_a_4623_);
v___x_4627_ = lp_algalVerification_Algal_Expr_addValueBytes(v_bytes_4559_, v___x_4626_);
lean_dec(v___x_4626_);
lean_dec(v_bytes_4559_);
v___x_4628_ = lp_algalVerification_Algal_Expr_liftE___redArg(v___x_4627_);
v_result_4629_ = lean_ctor_get(v___x_4628_, 0);
lean_inc_ref(v_result_4629_);
if (lean_obj_tag(v_result_4629_) == 0)
{
lean_object* v_a_4630_; lean_object* v___x_4632_; uint8_t v_isShared_4633_; uint8_t v_isSharedCheck_4637_; 
lean_dec_ref(v___x_4628_);
lean_del_object(v___x_4567_);
lean_dec(v_rest_4565_);
lean_dec(v_value_4564_);
lean_del_object(v___x_4562_);
lean_dec(v_idx_4560_);
lean_dec(v_acc_4558_);
lean_dec(v_body_4557_);
lean_dec_ref(v_name_4556_);
lean_dec_ref(v_op_4555_);
lean_dec(v_scope_2515_);
v_a_4630_ = lean_ctor_get(v_result_4629_, 0);
v_isSharedCheck_4637_ = !lean_is_exclusive(v_result_4629_);
if (v_isSharedCheck_4637_ == 0)
{
v___x_4632_ = v_result_4629_;
v_isShared_4633_ = v_isSharedCheck_4637_;
goto v_resetjp_4631_;
}
else
{
lean_inc(v_a_4630_);
lean_dec(v_result_4629_);
v___x_4632_ = lean_box(0);
v_isShared_4633_ = v_isSharedCheck_4637_;
goto v_resetjp_4631_;
}
v_resetjp_4631_:
{
lean_object* v___x_4635_; 
if (v_isShared_4633_ == 0)
{
v___x_4635_ = v___x_4632_;
goto v_reusejp_4634_;
}
else
{
lean_object* v_reuseFailAlloc_4636_; 
v_reuseFailAlloc_4636_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4636_, 0, v_a_4630_);
v___x_4635_ = v_reuseFailAlloc_4636_;
goto v_reusejp_4634_;
}
v_reusejp_4634_:
{
v_result_4602_ = v___x_4635_;
v_charges_4603_ = v___x_4614_;
goto v___jp_4601_;
}
}
}
else
{
lean_object* v_a_4638_; lean_object* v___x_4639_; lean_object* v___x_4641_; 
v_a_4638_ = lean_ctor_get(v_result_4629_, 0);
lean_inc(v_a_4638_);
lean_dec_ref_known(v_result_4629_, 1);
v___x_4639_ = lean_unsigned_to_nat(1024u);
if (v_isShared_4568_ == 0)
{
lean_ctor_set(v___x_4567_, 1, v_acc_4558_);
v___x_4641_ = v___x_4567_;
goto v_reusejp_4640_;
}
else
{
lean_object* v_reuseFailAlloc_4650_; 
v_reuseFailAlloc_4650_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_4650_, 0, v_value_4564_);
lean_ctor_set(v_reuseFailAlloc_4650_, 1, v_acc_4558_);
v___x_4641_ = v_reuseFailAlloc_4650_;
goto v_reusejp_4640_;
}
v_reusejp_4640_:
{
lean_object* v___x_4642_; uint8_t v___x_4643_; 
v___x_4642_ = lp_algalVerification_Algal_Expr_itemsLength(v___x_4641_);
v___x_4643_ = lean_nat_dec_lt(v___x_4639_, v___x_4642_);
lean_dec(v___x_4642_);
if (v___x_4643_ == 0)
{
lean_object* v___x_4644_; lean_object* v___x_4646_; 
v___x_4644_ = lean_nat_add(v_idx_4560_, v___x_4569_);
lean_dec(v_idx_4560_);
if (v_isShared_4563_ == 0)
{
lean_ctor_set(v___x_4562_, 6, v___x_4644_);
lean_ctor_set(v___x_4562_, 5, v_a_4638_);
lean_ctor_set(v___x_4562_, 4, v___x_4641_);
lean_ctor_set(v___x_4562_, 3, v_rest_4565_);
v___x_4646_ = v___x_4562_;
goto v_reusejp_4645_;
}
else
{
lean_object* v_reuseFailAlloc_4648_; 
v_reuseFailAlloc_4648_ = lean_alloc_ctor(5, 7, 1);
lean_ctor_set(v_reuseFailAlloc_4648_, 0, v_op_4555_);
lean_ctor_set(v_reuseFailAlloc_4648_, 1, v_name_4556_);
lean_ctor_set(v_reuseFailAlloc_4648_, 2, v_body_4557_);
lean_ctor_set(v_reuseFailAlloc_4648_, 3, v_rest_4565_);
lean_ctor_set(v_reuseFailAlloc_4648_, 4, v___x_4641_);
lean_ctor_set(v_reuseFailAlloc_4648_, 5, v_a_4638_);
lean_ctor_set(v_reuseFailAlloc_4648_, 6, v___x_4644_);
lean_ctor_set_uint8(v_reuseFailAlloc_4648_, sizeof(void*)*7, v_isMap_4554_);
v___x_4646_ = v_reuseFailAlloc_4648_;
goto v_reusejp_4645_;
}
v_reusejp_4645_:
{
lean_object* v___x_4647_; 
v___x_4647_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_4646_);
v___y_4607_ = v___x_4628_;
v___y_4608_ = v___x_4647_;
goto v___jp_4606_;
}
}
else
{
lean_object* v___x_4649_; 
lean_dec_ref(v___x_4641_);
lean_dec(v_a_4638_);
lean_dec(v_rest_4565_);
lean_del_object(v___x_4562_);
lean_dec(v_idx_4560_);
lean_dec(v_body_4557_);
lean_dec_ref(v_name_4556_);
lean_dec_ref(v_op_4555_);
lean_dec(v_scope_2515_);
v___x_4649_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___closed__42, &lp_algalVerification_Algal_Expr_machine___closed__42_once, _init_lp_algalVerification_Algal_Expr_machine___closed__42);
v___y_4607_ = v___x_4628_;
v___y_4608_ = v___x_4649_;
goto v___jp_4606_;
}
}
}
}
}
v___jp_4601_:
{
lean_object* v___x_4604_; lean_object* v___x_4605_; 
v___x_4604_ = lean_box(0);
v___x_4605_ = l_List_appendTR___redArg(v___x_4604_, v_charges_4603_);
v_result_4582_ = v_result_4602_;
v_charges_4583_ = v___x_4605_;
goto v___jp_4581_;
}
v___jp_4606_:
{
lean_object* v_result_4609_; lean_object* v_charges_4610_; lean_object* v_charges_4611_; lean_object* v___x_4612_; 
v_result_4609_ = lean_ctor_get(v___y_4608_, 0);
lean_inc_ref(v_result_4609_);
v_charges_4610_ = lean_ctor_get(v___y_4608_, 1);
lean_inc(v_charges_4610_);
lean_dec_ref(v___y_4608_);
v_charges_4611_ = lean_ctor_get(v___y_4607_, 1);
lean_inc(v_charges_4611_);
lean_dec_ref(v___y_4607_);
v___x_4612_ = l_List_appendTR___redArg(v_charges_4611_, v_charges_4610_);
v_result_4602_ = v_result_4609_;
v_charges_4603_ = v___x_4612_;
goto v___jp_4601_;
}
}
}
else
{
lean_object* v___x_4652_; lean_object* v___x_4653_; lean_object* v___x_4654_; lean_object* v___x_4655_; 
lean_del_object(v___x_4567_);
lean_dec(v_rest_4565_);
lean_dec(v_value_4564_);
lean_del_object(v___x_4562_);
lean_dec(v_bytes_4559_);
lean_dec(v_acc_4558_);
lean_dec(v_body_4557_);
lean_dec_ref(v_name_4556_);
lean_dec(v_scope_2515_);
v___x_4652_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asBool___closed__0));
v___x_4653_ = lp_algalVerification_Algal_Expr_kindOf(v_a_4592_);
lean_dec(v_a_4592_);
v___x_4654_ = lp_algalVerification_Algal_Expr_errType(v_op_4555_, v_idx_4560_, v___x_4652_, v___x_4653_);
v___x_4655_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_4654_);
v___y_4587_ = v___x_4655_;
goto v___jp_4586_;
}
}
else
{
lean_object* v_a_4656_; lean_object* v___x_4657_; lean_object* v___x_4658_; lean_object* v_result_4660_; lean_object* v_charges_4661_; lean_object* v___y_4665_; lean_object* v___y_4666_; lean_object* v_result_4671_; lean_object* v___x_4672_; 
lean_dec(v_value_4564_);
v_a_4656_ = lean_ctor_get(v_result_4590_, 0);
lean_inc_n(v_a_4656_, 2);
lean_dec_ref_known(v_result_4590_, 1);
v___x_4657_ = lp_algalVerification_Algal_Expr_valueBytes(v_a_4656_, v___x_4569_);
v___x_4658_ = lp_algalVerification_Algal_Expr_liftE___redArg(v___x_4657_);
v_result_4671_ = lean_ctor_get(v___x_4658_, 0);
lean_inc_ref(v_result_4671_);
lean_dec_ref(v___x_4658_);
v___x_4672_ = lean_box(0);
if (lean_obj_tag(v_result_4671_) == 0)
{
lean_object* v_a_4673_; lean_object* v___x_4675_; uint8_t v_isShared_4676_; uint8_t v_isSharedCheck_4680_; 
lean_dec(v_a_4656_);
lean_del_object(v___x_4567_);
lean_dec(v_rest_4565_);
lean_del_object(v___x_4562_);
lean_dec(v_idx_4560_);
lean_dec(v_bytes_4559_);
lean_dec(v_acc_4558_);
lean_dec(v_body_4557_);
lean_dec_ref(v_name_4556_);
lean_dec_ref(v_op_4555_);
lean_dec(v_scope_2515_);
v_a_4673_ = lean_ctor_get(v_result_4671_, 0);
v_isSharedCheck_4680_ = !lean_is_exclusive(v_result_4671_);
if (v_isSharedCheck_4680_ == 0)
{
v___x_4675_ = v_result_4671_;
v_isShared_4676_ = v_isSharedCheck_4680_;
goto v_resetjp_4674_;
}
else
{
lean_inc(v_a_4673_);
lean_dec(v_result_4671_);
v___x_4675_ = lean_box(0);
v_isShared_4676_ = v_isSharedCheck_4680_;
goto v_resetjp_4674_;
}
v_resetjp_4674_:
{
lean_object* v___x_4678_; 
if (v_isShared_4676_ == 0)
{
v___x_4678_ = v___x_4675_;
goto v_reusejp_4677_;
}
else
{
lean_object* v_reuseFailAlloc_4679_; 
v_reuseFailAlloc_4679_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4679_, 0, v_a_4673_);
v___x_4678_ = v_reuseFailAlloc_4679_;
goto v_reusejp_4677_;
}
v_reusejp_4677_:
{
v_result_4582_ = v___x_4678_;
v_charges_4583_ = v___x_4672_;
goto v___jp_4581_;
}
}
}
else
{
lean_object* v_a_4681_; lean_object* v___y_4683_; 
v_a_4681_ = lean_ctor_get(v_result_4671_, 0);
lean_inc(v_a_4681_);
lean_dec_ref_known(v_result_4671_, 1);
if (lean_obj_tag(v_acc_4558_) == 0)
{
lean_object* v___x_4709_; 
v___x_4709_ = lean_unsigned_to_nat(0u);
v___y_4683_ = v___x_4709_;
goto v___jp_4682_;
}
else
{
v___y_4683_ = v___x_4569_;
goto v___jp_4682_;
}
v___jp_4682_:
{
lean_object* v___x_4684_; lean_object* v___x_4685_; lean_object* v___x_4686_; lean_object* v_result_4687_; 
v___x_4684_ = lean_nat_add(v_a_4681_, v___y_4683_);
lean_dec(v_a_4681_);
v___x_4685_ = lp_algalVerification_Algal_Expr_addValueBytes(v_bytes_4559_, v___x_4684_);
lean_dec(v___x_4684_);
lean_dec(v_bytes_4559_);
v___x_4686_ = lp_algalVerification_Algal_Expr_liftE___redArg(v___x_4685_);
v_result_4687_ = lean_ctor_get(v___x_4686_, 0);
lean_inc_ref(v_result_4687_);
if (lean_obj_tag(v_result_4687_) == 0)
{
lean_object* v_a_4688_; lean_object* v___x_4690_; uint8_t v_isShared_4691_; uint8_t v_isSharedCheck_4695_; 
lean_dec_ref(v___x_4686_);
lean_dec(v_a_4656_);
lean_del_object(v___x_4567_);
lean_dec(v_rest_4565_);
lean_del_object(v___x_4562_);
lean_dec(v_idx_4560_);
lean_dec(v_acc_4558_);
lean_dec(v_body_4557_);
lean_dec_ref(v_name_4556_);
lean_dec_ref(v_op_4555_);
lean_dec(v_scope_2515_);
v_a_4688_ = lean_ctor_get(v_result_4687_, 0);
v_isSharedCheck_4695_ = !lean_is_exclusive(v_result_4687_);
if (v_isSharedCheck_4695_ == 0)
{
v___x_4690_ = v_result_4687_;
v_isShared_4691_ = v_isSharedCheck_4695_;
goto v_resetjp_4689_;
}
else
{
lean_inc(v_a_4688_);
lean_dec(v_result_4687_);
v___x_4690_ = lean_box(0);
v_isShared_4691_ = v_isSharedCheck_4695_;
goto v_resetjp_4689_;
}
v_resetjp_4689_:
{
lean_object* v___x_4693_; 
if (v_isShared_4691_ == 0)
{
v___x_4693_ = v___x_4690_;
goto v_reusejp_4692_;
}
else
{
lean_object* v_reuseFailAlloc_4694_; 
v_reuseFailAlloc_4694_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_4694_, 0, v_a_4688_);
v___x_4693_ = v_reuseFailAlloc_4694_;
goto v_reusejp_4692_;
}
v_reusejp_4692_:
{
v_result_4660_ = v___x_4693_;
v_charges_4661_ = v___x_4672_;
goto v___jp_4659_;
}
}
}
else
{
lean_object* v_a_4696_; lean_object* v___x_4697_; lean_object* v___x_4699_; 
v_a_4696_ = lean_ctor_get(v_result_4687_, 0);
lean_inc(v_a_4696_);
lean_dec_ref_known(v_result_4687_, 1);
v___x_4697_ = lean_unsigned_to_nat(1024u);
if (v_isShared_4568_ == 0)
{
lean_ctor_set(v___x_4567_, 1, v_acc_4558_);
lean_ctor_set(v___x_4567_, 0, v_a_4656_);
v___x_4699_ = v___x_4567_;
goto v_reusejp_4698_;
}
else
{
lean_object* v_reuseFailAlloc_4708_; 
v_reuseFailAlloc_4708_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_4708_, 0, v_a_4656_);
lean_ctor_set(v_reuseFailAlloc_4708_, 1, v_acc_4558_);
v___x_4699_ = v_reuseFailAlloc_4708_;
goto v_reusejp_4698_;
}
v_reusejp_4698_:
{
lean_object* v___x_4700_; uint8_t v___x_4701_; 
v___x_4700_ = lp_algalVerification_Algal_Expr_itemsLength(v___x_4699_);
v___x_4701_ = lean_nat_dec_lt(v___x_4697_, v___x_4700_);
lean_dec(v___x_4700_);
if (v___x_4701_ == 0)
{
lean_object* v___x_4702_; lean_object* v___x_4704_; 
v___x_4702_ = lean_nat_add(v_idx_4560_, v___x_4569_);
lean_dec(v_idx_4560_);
if (v_isShared_4563_ == 0)
{
lean_ctor_set(v___x_4562_, 6, v___x_4702_);
lean_ctor_set(v___x_4562_, 5, v_a_4696_);
lean_ctor_set(v___x_4562_, 4, v___x_4699_);
lean_ctor_set(v___x_4562_, 3, v_rest_4565_);
v___x_4704_ = v___x_4562_;
goto v_reusejp_4703_;
}
else
{
lean_object* v_reuseFailAlloc_4706_; 
v_reuseFailAlloc_4706_ = lean_alloc_ctor(5, 7, 1);
lean_ctor_set(v_reuseFailAlloc_4706_, 0, v_op_4555_);
lean_ctor_set(v_reuseFailAlloc_4706_, 1, v_name_4556_);
lean_ctor_set(v_reuseFailAlloc_4706_, 2, v_body_4557_);
lean_ctor_set(v_reuseFailAlloc_4706_, 3, v_rest_4565_);
lean_ctor_set(v_reuseFailAlloc_4706_, 4, v___x_4699_);
lean_ctor_set(v_reuseFailAlloc_4706_, 5, v_a_4696_);
lean_ctor_set(v_reuseFailAlloc_4706_, 6, v___x_4702_);
lean_ctor_set_uint8(v_reuseFailAlloc_4706_, sizeof(void*)*7, v_isMap_4554_);
v___x_4704_ = v_reuseFailAlloc_4706_;
goto v_reusejp_4703_;
}
v_reusejp_4703_:
{
lean_object* v___x_4705_; 
v___x_4705_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_4704_);
v___y_4665_ = v___x_4686_;
v___y_4666_ = v___x_4705_;
goto v___jp_4664_;
}
}
else
{
lean_object* v___x_4707_; 
lean_dec_ref(v___x_4699_);
lean_dec(v_a_4696_);
lean_dec(v_rest_4565_);
lean_del_object(v___x_4562_);
lean_dec(v_idx_4560_);
lean_dec(v_body_4557_);
lean_dec_ref(v_name_4556_);
lean_dec_ref(v_op_4555_);
lean_dec(v_scope_2515_);
v___x_4707_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___closed__42, &lp_algalVerification_Algal_Expr_machine___closed__42_once, _init_lp_algalVerification_Algal_Expr_machine___closed__42);
v___y_4665_ = v___x_4686_;
v___y_4666_ = v___x_4707_;
goto v___jp_4664_;
}
}
}
}
}
v___jp_4659_:
{
lean_object* v___x_4662_; lean_object* v___x_4663_; 
v___x_4662_ = lean_box(0);
v___x_4663_ = l_List_appendTR___redArg(v___x_4662_, v_charges_4661_);
v_result_4582_ = v_result_4660_;
v_charges_4583_ = v___x_4663_;
goto v___jp_4581_;
}
v___jp_4664_:
{
lean_object* v_result_4667_; lean_object* v_charges_4668_; lean_object* v_charges_4669_; lean_object* v___x_4670_; 
v_result_4667_ = lean_ctor_get(v___y_4666_, 0);
lean_inc_ref(v_result_4667_);
v_charges_4668_ = lean_ctor_get(v___y_4666_, 1);
lean_inc(v_charges_4668_);
lean_dec_ref(v___y_4666_);
v_charges_4669_ = lean_ctor_get(v___y_4665_, 1);
lean_inc(v_charges_4669_);
lean_dec_ref(v___y_4665_);
v___x_4670_ = l_List_appendTR___redArg(v_charges_4669_, v_charges_4668_);
v_result_4660_ = v_result_4667_;
v_charges_4661_ = v___x_4670_;
goto v___jp_4659_;
}
}
}
v___jp_4571_:
{
lean_object* v_charges_4574_; lean_object* v___x_4575_; lean_object* v___x_4576_; 
v_charges_4574_ = lean_ctor_get(v___x_4570_, 1);
lean_inc(v_charges_4574_);
v___x_4575_ = l_List_appendTR___redArg(v_charges_4574_, v_charges_4573_);
v___x_4576_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_4576_, 0, v_result_4572_);
lean_ctor_set(v___x_4576_, 1, v___x_4575_);
return v___x_4576_;
}
v___jp_4581_:
{
lean_object* v_charges_4584_; lean_object* v___x_4585_; 
v_charges_4584_ = lean_ctor_get(v___x_4580_, 1);
lean_inc(v_charges_4584_);
lean_dec_ref(v___x_4580_);
v___x_4585_ = l_List_appendTR___redArg(v_charges_4584_, v_charges_4583_);
v_result_4572_ = v_result_4582_;
v_charges_4573_ = v___x_4585_;
goto v___jp_4571_;
}
v___jp_4586_:
{
lean_object* v_result_4588_; lean_object* v_charges_4589_; 
v_result_4588_ = lean_ctor_get(v___y_4587_, 0);
lean_inc_ref(v_result_4588_);
v_charges_4589_ = lean_ctor_get(v___y_4587_, 1);
lean_inc(v_charges_4589_);
lean_dec_ref(v___y_4587_);
v_result_4582_ = v_result_4588_;
v_charges_4583_ = v_charges_4589_;
goto v___jp_4581_;
}
}
}
}
}
default: 
{
lean_object* v_pending_4713_; 
v_pending_4713_ = lean_ctor_get(v_w_2516_, 4);
lean_inc(v_pending_4713_);
if (lean_obj_tag(v_pending_4713_) == 0)
{
lean_object* v_acc_4714_; lean_object* v___x_4715_; lean_object* v___x_4716_; lean_object* v___x_4717_; 
lean_dec(v_scope_2515_);
v_acc_4714_ = lean_ctor_get(v_w_2516_, 3);
lean_inc(v_acc_4714_);
lean_dec_ref_known(v_w_2516_, 5);
v___x_4715_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_4715_, 0, v_acc_4714_);
v___x_4716_ = lean_box(0);
v___x_4717_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_4717_, 0, v___x_4715_);
lean_ctor_set(v___x_4717_, 1, v___x_4716_);
return v___x_4717_;
}
else
{
lean_object* v_accName_4718_; lean_object* v_itemName_4719_; lean_object* v_body_4720_; lean_object* v_acc_4721_; lean_object* v___x_4723_; uint8_t v_isShared_4724_; uint8_t v_isSharedCheck_4757_; 
v_accName_4718_ = lean_ctor_get(v_w_2516_, 0);
v_itemName_4719_ = lean_ctor_get(v_w_2516_, 1);
v_body_4720_ = lean_ctor_get(v_w_2516_, 2);
v_acc_4721_ = lean_ctor_get(v_w_2516_, 3);
v_isSharedCheck_4757_ = !lean_is_exclusive(v_w_2516_);
if (v_isSharedCheck_4757_ == 0)
{
lean_object* v_unused_4758_; 
v_unused_4758_ = lean_ctor_get(v_w_2516_, 4);
lean_dec(v_unused_4758_);
v___x_4723_ = v_w_2516_;
v_isShared_4724_ = v_isSharedCheck_4757_;
goto v_resetjp_4722_;
}
else
{
lean_inc(v_acc_4721_);
lean_inc(v_body_4720_);
lean_inc(v_itemName_4719_);
lean_inc(v_accName_4718_);
lean_dec(v_w_2516_);
v___x_4723_ = lean_box(0);
v_isShared_4724_ = v_isSharedCheck_4757_;
goto v_resetjp_4722_;
}
v_resetjp_4722_:
{
lean_object* v_value_4725_; lean_object* v_rest_4726_; lean_object* v___x_4728_; uint8_t v_isShared_4729_; uint8_t v_isSharedCheck_4756_; 
v_value_4725_ = lean_ctor_get(v_pending_4713_, 0);
v_rest_4726_ = lean_ctor_get(v_pending_4713_, 1);
v_isSharedCheck_4756_ = !lean_is_exclusive(v_pending_4713_);
if (v_isSharedCheck_4756_ == 0)
{
v___x_4728_ = v_pending_4713_;
v_isShared_4729_ = v_isSharedCheck_4756_;
goto v_resetjp_4727_;
}
else
{
lean_inc(v_rest_4726_);
lean_inc(v_value_4725_);
lean_dec(v_pending_4713_);
v___x_4728_ = lean_box(0);
v_isShared_4729_ = v_isSharedCheck_4756_;
goto v_resetjp_4727_;
}
v_resetjp_4727_:
{
lean_object* v___x_4730_; lean_object* v_result_4732_; lean_object* v_charges_4733_; lean_object* v___x_4739_; lean_object* v___x_4740_; lean_object* v___x_4741_; lean_object* v___x_4742_; lean_object* v___x_4743_; lean_object* v___x_4744_; lean_object* v_result_4745_; 
v___x_4730_ = lean_obj_once(&lp_algalVerification_Algal_Expr_machine___closed__0, &lp_algalVerification_Algal_Expr_machine___closed__0_once, _init_lp_algalVerification_Algal_Expr_machine___closed__0);
lean_inc_ref(v_itemName_4719_);
v___x_4739_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_4739_, 0, v_itemName_4719_);
lean_ctor_set(v___x_4739_, 1, v_value_4725_);
lean_inc_ref(v_accName_4718_);
v___x_4740_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_4740_, 0, v_accName_4718_);
lean_ctor_set(v___x_4740_, 1, v_acc_4721_);
lean_inc(v_scope_2515_);
v___x_4741_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_4741_, 0, v___x_4740_);
lean_ctor_set(v___x_4741_, 1, v_scope_2515_);
v___x_4742_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_4742_, 0, v___x_4739_);
lean_ctor_set(v___x_4742_, 1, v___x_4741_);
lean_inc(v_body_4720_);
v___x_4743_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_4743_, 0, v_body_4720_);
v___x_4744_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v___x_4742_, v___x_4743_);
v_result_4745_ = lean_ctor_get(v___x_4744_, 0);
lean_inc_ref(v_result_4745_);
if (lean_obj_tag(v_result_4745_) == 0)
{
lean_object* v_charges_4746_; 
lean_dec(v_rest_4726_);
lean_del_object(v___x_4723_);
lean_dec(v_body_4720_);
lean_dec_ref(v_itemName_4719_);
lean_dec_ref(v_accName_4718_);
lean_dec(v_scope_2515_);
v_charges_4746_ = lean_ctor_get(v___x_4744_, 1);
lean_inc(v_charges_4746_);
lean_dec_ref(v___x_4744_);
v_result_4732_ = v_result_4745_;
v_charges_4733_ = v_charges_4746_;
goto v___jp_4731_;
}
else
{
lean_object* v_charges_4747_; lean_object* v_a_4748_; lean_object* v___x_4750_; 
v_charges_4747_ = lean_ctor_get(v___x_4744_, 1);
lean_inc(v_charges_4747_);
lean_dec_ref(v___x_4744_);
v_a_4748_ = lean_ctor_get(v_result_4745_, 0);
lean_inc(v_a_4748_);
lean_dec_ref_known(v_result_4745_, 1);
if (v_isShared_4724_ == 0)
{
lean_ctor_set(v___x_4723_, 4, v_rest_4726_);
lean_ctor_set(v___x_4723_, 3, v_a_4748_);
v___x_4750_ = v___x_4723_;
goto v_reusejp_4749_;
}
else
{
lean_object* v_reuseFailAlloc_4755_; 
v_reuseFailAlloc_4755_ = lean_alloc_ctor(6, 5, 0);
lean_ctor_set(v_reuseFailAlloc_4755_, 0, v_accName_4718_);
lean_ctor_set(v_reuseFailAlloc_4755_, 1, v_itemName_4719_);
lean_ctor_set(v_reuseFailAlloc_4755_, 2, v_body_4720_);
lean_ctor_set(v_reuseFailAlloc_4755_, 3, v_a_4748_);
lean_ctor_set(v_reuseFailAlloc_4755_, 4, v_rest_4726_);
v___x_4750_ = v_reuseFailAlloc_4755_;
goto v_reusejp_4749_;
}
v_reusejp_4749_:
{
lean_object* v___x_4751_; lean_object* v_result_4752_; lean_object* v_charges_4753_; lean_object* v___x_4754_; 
v___x_4751_ = lp_algalVerification_Algal_Expr_machine(v_env_2514_, v_scope_2515_, v___x_4750_);
v_result_4752_ = lean_ctor_get(v___x_4751_, 0);
lean_inc_ref(v_result_4752_);
v_charges_4753_ = lean_ctor_get(v___x_4751_, 1);
lean_inc(v_charges_4753_);
lean_dec_ref(v___x_4751_);
v___x_4754_ = l_List_appendTR___redArg(v_charges_4747_, v_charges_4753_);
v_result_4732_ = v_result_4752_;
v_charges_4733_ = v___x_4754_;
goto v___jp_4731_;
}
}
v___jp_4731_:
{
lean_object* v_charges_4734_; lean_object* v___x_4735_; lean_object* v___x_4737_; 
v_charges_4734_ = lean_ctor_get(v___x_4730_, 1);
lean_inc(v_charges_4734_);
v___x_4735_ = l_List_appendTR___redArg(v_charges_4734_, v_charges_4733_);
if (v_isShared_4729_ == 0)
{
lean_ctor_set_tag(v___x_4728_, 0);
lean_ctor_set(v___x_4728_, 1, v___x_4735_);
lean_ctor_set(v___x_4728_, 0, v_result_4732_);
v___x_4737_ = v___x_4728_;
goto v_reusejp_4736_;
}
else
{
lean_object* v_reuseFailAlloc_4738_; 
v_reuseFailAlloc_4738_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_4738_, 0, v_result_4732_);
lean_ctor_set(v_reuseFailAlloc_4738_, 1, v___x_4735_);
v___x_4737_ = v_reuseFailAlloc_4738_;
goto v_reusejp_4736_;
}
v_reusejp_4736_:
{
return v___x_4737_;
}
}
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__9(lean_object* v___x_4759_, lean_object* v_value_4760_, lean_object* v_rest_4761_, lean_object* v_env_4762_, lean_object* v_scope_4763_, lean_object* v_00___4764_){
_start:
{
lean_object* v___x_4765_; uint8_t v___x_4766_; 
v___x_4765_ = lean_unsigned_to_nat(0u);
v___x_4766_ = lean_nat_dec_eq(v___x_4759_, v___x_4765_);
if (v___x_4766_ == 0)
{
lean_object* v___x_4767_; uint8_t v___x_4768_; lean_object* v___x_4769_; lean_object* v___x_4770_; 
v___x_4767_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__0));
v___x_4768_ = lean_string_dec_eq(v_value_4760_, v___x_4767_);
v___x_4769_ = lean_alloc_ctor(3, 3, 1);
lean_ctor_set(v___x_4769_, 0, v_value_4760_);
lean_ctor_set(v___x_4769_, 1, v_rest_4761_);
lean_ctor_set(v___x_4769_, 2, v___x_4765_);
lean_ctor_set_uint8(v___x_4769_, sizeof(void*)*3, v___x_4768_);
v___x_4770_ = lp_algalVerification_Algal_Expr_machine(v_env_4762_, v_scope_4763_, v___x_4769_);
return v___x_4770_;
}
else
{
lean_object* v___x_4771_; lean_object* v___x_4772_; lean_object* v___x_4773_; 
lean_dec(v_scope_4763_);
lean_dec(v_rest_4761_);
v___x_4771_ = ((lean_object*)(lp_algalVerification_Algal_Expr_machine___lam__9___closed__0));
v___x_4772_ = lp_algalVerification_Algal_Expr_errArity(v_value_4760_, v___x_4771_, v___x_4765_);
v___x_4773_ = lp_algalVerification_Algal_Expr_fail___redArg(v___x_4772_);
return v___x_4773_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__9___boxed(lean_object* v___x_4774_, lean_object* v_value_4775_, lean_object* v_rest_4776_, lean_object* v_env_4777_, lean_object* v_scope_4778_, lean_object* v_00___4779_){
_start:
{
lean_object* v_res_4780_; 
v_res_4780_ = lp_algalVerification_Algal_Expr_machine___lam__9(v___x_4774_, v_value_4775_, v_rest_4776_, v_env_4777_, v_scope_4778_, v_00___4779_);
lean_dec(v_env_4777_);
lean_dec(v___x_4774_);
return v_res_4780_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__11___boxed(lean_object* v_value_4781_, lean_object* v___x_4782_, lean_object* v_rest_4783_, lean_object* v_env_4784_, lean_object* v_scope_4785_, lean_object* v_00___4786_){
_start:
{
lean_object* v_res_4787_; 
v_res_4787_ = lp_algalVerification_Algal_Expr_machine___lam__11(v_value_4781_, v___x_4782_, v_rest_4783_, v_env_4784_, v_scope_4785_, v_00___4786_);
lean_dec(v_env_4784_);
lean_dec(v_rest_4783_);
return v_res_4787_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__16___boxed(lean_object* v_value_4788_, lean_object* v___x_4789_, lean_object* v_rest_4790_, lean_object* v_env_4791_, lean_object* v_scope_4792_, lean_object* v_00___4793_){
_start:
{
lean_object* v_res_4794_; 
v_res_4794_ = lp_algalVerification_Algal_Expr_machine___lam__16(v_value_4788_, v___x_4789_, v_rest_4790_, v_env_4791_, v_scope_4792_, v_00___4793_);
lean_dec(v_env_4791_);
lean_dec(v_rest_4790_);
return v_res_4794_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__4___boxed(lean_object* v_value_4795_, lean_object* v_rest_4796_, lean_object* v_env_4797_, lean_object* v_scope_4798_, lean_object* v_00___4799_){
_start:
{
lean_object* v_res_4800_; 
v_res_4800_ = lp_algalVerification_Algal_Expr_machine___lam__4(v_value_4795_, v_rest_4796_, v_env_4797_, v_scope_4798_, v_00___4799_);
lean_dec(v_env_4797_);
return v_res_4800_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__15___boxed(lean_object* v_value_4801_, lean_object* v___x_4802_, lean_object* v_rest_4803_, lean_object* v_env_4804_, lean_object* v_scope_4805_, lean_object* v_00___4806_){
_start:
{
lean_object* v_res_4807_; 
v_res_4807_ = lp_algalVerification_Algal_Expr_machine___lam__15(v_value_4801_, v___x_4802_, v_rest_4803_, v_env_4804_, v_scope_4805_, v_00___4806_);
lean_dec(v_env_4804_);
lean_dec(v_rest_4803_);
return v_res_4807_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__1___boxed(lean_object* v_value_4808_, lean_object* v_rest_4809_, lean_object* v_env_4810_, lean_object* v_scope_4811_, lean_object* v_00___4812_){
_start:
{
lean_object* v_res_4813_; 
v_res_4813_ = lp_algalVerification_Algal_Expr_machine___lam__1(v_value_4808_, v_rest_4809_, v_env_4810_, v_scope_4811_, v_00___4812_);
lean_dec(v_env_4810_);
return v_res_4813_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__5___boxed(lean_object* v_value_4814_, lean_object* v___x_4815_, lean_object* v_rest_4816_, lean_object* v_env_4817_, lean_object* v_scope_4818_, lean_object* v_00___4819_){
_start:
{
lean_object* v_res_4820_; 
v_res_4820_ = lp_algalVerification_Algal_Expr_machine___lam__5(v_value_4814_, v___x_4815_, v_rest_4816_, v_env_4817_, v_scope_4818_, v_00___4819_);
lean_dec(v_env_4817_);
lean_dec(v_rest_4816_);
return v_res_4820_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__12___boxed(lean_object* v_value_4821_, lean_object* v___x_4822_, lean_object* v_rest_4823_, lean_object* v_env_4824_, lean_object* v_scope_4825_, lean_object* v_00___4826_){
_start:
{
lean_object* v_res_4827_; 
v_res_4827_ = lp_algalVerification_Algal_Expr_machine___lam__12(v_value_4821_, v___x_4822_, v_rest_4823_, v_env_4824_, v_scope_4825_, v_00___4826_);
lean_dec(v_env_4824_);
lean_dec(v_rest_4823_);
return v_res_4827_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__13___boxed(lean_object* v_value_4828_, lean_object* v___x_4829_, lean_object* v_rest_4830_, lean_object* v_env_4831_, lean_object* v_scope_4832_, lean_object* v_00___4833_){
_start:
{
lean_object* v_res_4834_; 
v_res_4834_ = lp_algalVerification_Algal_Expr_machine___lam__13(v_value_4828_, v___x_4829_, v_rest_4830_, v_env_4831_, v_scope_4832_, v_00___4833_);
lean_dec(v_env_4831_);
lean_dec(v_rest_4830_);
return v_res_4834_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__10___boxed(lean_object* v_value_4835_, lean_object* v_rest_4836_, lean_object* v_env_4837_, lean_object* v_scope_4838_, lean_object* v___f_4839_, lean_object* v_00___4840_){
_start:
{
lean_object* v_res_4841_; 
v_res_4841_ = lp_algalVerification_Algal_Expr_machine___lam__10(v_value_4835_, v_rest_4836_, v_env_4837_, v_scope_4838_, v___f_4839_, v_00___4840_);
lean_dec(v_env_4837_);
return v_res_4841_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__14___boxed(lean_object* v_value_4842_, lean_object* v___x_4843_, lean_object* v_rest_4844_, lean_object* v_env_4845_, lean_object* v_scope_4846_, lean_object* v_00___4847_){
_start:
{
lean_object* v_res_4848_; 
v_res_4848_ = lp_algalVerification_Algal_Expr_machine___lam__14(v_value_4842_, v___x_4843_, v_rest_4844_, v_env_4845_, v_scope_4846_, v_00___4847_);
lean_dec(v_env_4845_);
lean_dec(v_rest_4844_);
return v_res_4848_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__2___boxed(lean_object* v_value_4849_, lean_object* v___x_4850_, lean_object* v_rest_4851_, lean_object* v_env_4852_, lean_object* v_scope_4853_, lean_object* v_value_4854_, lean_object* v_00___4855_){
_start:
{
lean_object* v_res_4856_; 
v_res_4856_ = lp_algalVerification_Algal_Expr_machine___lam__2(v_value_4849_, v___x_4850_, v_rest_4851_, v_env_4852_, v_scope_4853_, v_value_4854_, v_00___4855_);
lean_dec(v_env_4852_);
return v_res_4856_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___lam__8___boxed(lean_object* v_value_4857_, lean_object* v_rest_4858_, lean_object* v_env_4859_, lean_object* v_scope_4860_, lean_object* v___f_4861_, lean_object* v_00___4862_){
_start:
{
lean_object* v_res_4863_; 
v_res_4863_ = lp_algalVerification_Algal_Expr_machine___lam__8(v_value_4857_, v_rest_4858_, v_env_4859_, v_scope_4860_, v___f_4861_, v_00___4862_);
lean_dec(v_env_4859_);
return v_res_4863_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_machine___boxed(lean_object* v_env_4864_, lean_object* v_scope_4865_, lean_object* v_w_4866_){
_start:
{
lean_object* v_res_4867_; 
v_res_4867_ = lp_algalVerification_Algal_Expr_machine(v_env_4864_, v_scope_4865_, v_w_4866_);
lean_dec(v_env_4864_);
return v_res_4867_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__44_splitter___redArg(lean_object* v_w_4868_, lean_object* v_h__1_4869_, lean_object* v_h__2_4870_, lean_object* v_h__3_4871_, lean_object* v_h__4_4872_, lean_object* v_h__5_4873_, lean_object* v_h__6_4874_, lean_object* v_h__7_4875_, lean_object* v_h__8_4876_, lean_object* v_h__9_4877_, lean_object* v_h__10_4878_, lean_object* v_h__11_4879_, lean_object* v_h__12_4880_, lean_object* v_h__13_4881_, lean_object* v_h__14_4882_, lean_object* v_h__15_4883_, lean_object* v_h__16_4884_, lean_object* v_h__17_4885_){
_start:
{
switch(lean_obj_tag(v_w_4868_))
{
case 0:
{
lean_object* v_v_4886_; 
lean_dec(v_h__17_4885_);
lean_dec(v_h__16_4884_);
lean_dec(v_h__15_4883_);
lean_dec(v_h__14_4882_);
lean_dec(v_h__13_4881_);
lean_dec(v_h__12_4880_);
lean_dec(v_h__11_4879_);
lean_dec(v_h__10_4878_);
lean_dec(v_h__9_4877_);
lean_dec(v_h__8_4876_);
lean_dec(v_h__7_4875_);
lean_dec(v_h__6_4874_);
v_v_4886_ = lean_ctor_get(v_w_4868_, 0);
lean_inc(v_v_4886_);
lean_dec_ref_known(v_w_4868_, 1);
switch(lean_obj_tag(v_v_4886_))
{
case 5:
{
lean_object* v_fields_4887_; lean_object* v___x_4888_; 
lean_dec(v_h__5_4873_);
lean_dec(v_h__4_4872_);
lean_dec(v_h__3_4871_);
lean_dec(v_h__2_4870_);
v_fields_4887_ = lean_ctor_get(v_v_4886_, 0);
lean_inc(v_fields_4887_);
lean_dec_ref_known(v_v_4886_, 1);
v___x_4888_ = lean_apply_1(v_h__1_4869_, v_fields_4887_);
return v___x_4888_;
}
case 4:
{
lean_object* v_values_4889_; 
lean_dec(v_h__5_4873_);
lean_dec(v_h__1_4869_);
v_values_4889_ = lean_ctor_get(v_v_4886_, 0);
lean_inc(v_values_4889_);
lean_dec_ref_known(v_v_4886_, 1);
if (lean_obj_tag(v_values_4889_) == 0)
{
lean_object* v___x_4890_; lean_object* v___x_4891_; 
lean_dec(v_h__4_4872_);
lean_dec(v_h__2_4870_);
v___x_4890_ = lean_box(0);
v___x_4891_ = lean_apply_1(v_h__3_4871_, v___x_4890_);
return v___x_4891_;
}
else
{
lean_object* v_value_4892_; 
lean_dec(v_h__3_4871_);
v_value_4892_ = lean_ctor_get(v_values_4889_, 0);
lean_inc(v_value_4892_);
if (lean_obj_tag(v_value_4892_) == 3)
{
lean_object* v_rest_4893_; lean_object* v_value_4894_; lean_object* v___x_4895_; 
lean_dec(v_h__4_4872_);
v_rest_4893_ = lean_ctor_get(v_values_4889_, 1);
lean_inc(v_rest_4893_);
lean_dec_ref_known(v_values_4889_, 2);
v_value_4894_ = lean_ctor_get(v_value_4892_, 0);
lean_inc_ref(v_value_4894_);
lean_dec_ref_known(v_value_4892_, 1);
v___x_4895_ = lean_apply_2(v_h__2_4870_, v_value_4894_, v_rest_4893_);
return v___x_4895_;
}
else
{
lean_object* v_rest_4896_; lean_object* v___x_4897_; 
lean_dec(v_h__2_4870_);
v_rest_4896_ = lean_ctor_get(v_values_4889_, 1);
lean_inc(v_rest_4896_);
lean_dec_ref_known(v_values_4889_, 2);
v___x_4897_ = lean_apply_3(v_h__4_4872_, v_value_4892_, v_rest_4896_, lean_box(0));
return v___x_4897_;
}
}
}
default: 
{
lean_object* v___x_4898_; 
lean_dec(v_h__4_4872_);
lean_dec(v_h__3_4871_);
lean_dec(v_h__2_4870_);
lean_dec(v_h__1_4869_);
v___x_4898_ = lean_apply_5(v_h__5_4873_, v_v_4886_, lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_4898_;
}
}
}
case 1:
{
lean_object* v_pending_4899_; 
lean_dec(v_h__17_4885_);
lean_dec(v_h__16_4884_);
lean_dec(v_h__15_4883_);
lean_dec(v_h__14_4882_);
lean_dec(v_h__13_4881_);
lean_dec(v_h__12_4880_);
lean_dec(v_h__11_4879_);
lean_dec(v_h__10_4878_);
lean_dec(v_h__9_4877_);
lean_dec(v_h__8_4876_);
lean_dec(v_h__5_4873_);
lean_dec(v_h__4_4872_);
lean_dec(v_h__3_4871_);
lean_dec(v_h__2_4870_);
lean_dec(v_h__1_4869_);
v_pending_4899_ = lean_ctor_get(v_w_4868_, 0);
if (lean_obj_tag(v_pending_4899_) == 0)
{
lean_object* v_acc_4900_; lean_object* v_bytes_4901_; lean_object* v___x_4902_; 
lean_dec(v_h__7_4875_);
v_acc_4900_ = lean_ctor_get(v_w_4868_, 1);
lean_inc(v_acc_4900_);
v_bytes_4901_ = lean_ctor_get(v_w_4868_, 2);
lean_inc(v_bytes_4901_);
lean_dec_ref_known(v_w_4868_, 3);
v___x_4902_ = lean_apply_2(v_h__6_4874_, v_acc_4900_, v_bytes_4901_);
return v___x_4902_;
}
else
{
lean_object* v_acc_4903_; lean_object* v_bytes_4904_; lean_object* v_value_4905_; lean_object* v_rest_4906_; lean_object* v___x_4907_; 
lean_inc_ref(v_pending_4899_);
lean_dec(v_h__6_4874_);
v_acc_4903_ = lean_ctor_get(v_w_4868_, 1);
lean_inc(v_acc_4903_);
v_bytes_4904_ = lean_ctor_get(v_w_4868_, 2);
lean_inc(v_bytes_4904_);
lean_dec_ref_known(v_w_4868_, 3);
v_value_4905_ = lean_ctor_get(v_pending_4899_, 0);
lean_inc(v_value_4905_);
v_rest_4906_ = lean_ctor_get(v_pending_4899_, 1);
lean_inc(v_rest_4906_);
lean_dec_ref_known(v_pending_4899_, 2);
v___x_4907_ = lean_apply_4(v_h__7_4875_, v_value_4905_, v_rest_4906_, v_acc_4903_, v_bytes_4904_);
return v___x_4907_;
}
}
case 2:
{
lean_object* v_pending_4908_; 
lean_dec(v_h__17_4885_);
lean_dec(v_h__16_4884_);
lean_dec(v_h__15_4883_);
lean_dec(v_h__14_4882_);
lean_dec(v_h__13_4881_);
lean_dec(v_h__12_4880_);
lean_dec(v_h__11_4879_);
lean_dec(v_h__10_4878_);
lean_dec(v_h__7_4875_);
lean_dec(v_h__6_4874_);
lean_dec(v_h__5_4873_);
lean_dec(v_h__4_4872_);
lean_dec(v_h__3_4871_);
lean_dec(v_h__2_4870_);
lean_dec(v_h__1_4869_);
v_pending_4908_ = lean_ctor_get(v_w_4868_, 0);
if (lean_obj_tag(v_pending_4908_) == 0)
{
lean_object* v_acc_4909_; lean_object* v_bytes_4910_; lean_object* v___x_4911_; 
lean_dec(v_h__9_4877_);
v_acc_4909_ = lean_ctor_get(v_w_4868_, 1);
lean_inc(v_acc_4909_);
v_bytes_4910_ = lean_ctor_get(v_w_4868_, 2);
lean_inc(v_bytes_4910_);
lean_dec_ref_known(v_w_4868_, 3);
v___x_4911_ = lean_apply_2(v_h__8_4876_, v_acc_4909_, v_bytes_4910_);
return v___x_4911_;
}
else
{
lean_object* v_acc_4912_; lean_object* v_bytes_4913_; lean_object* v_key_4914_; lean_object* v_value_4915_; lean_object* v_rest_4916_; lean_object* v___x_4917_; 
lean_inc_ref(v_pending_4908_);
lean_dec(v_h__8_4876_);
v_acc_4912_ = lean_ctor_get(v_w_4868_, 1);
lean_inc(v_acc_4912_);
v_bytes_4913_ = lean_ctor_get(v_w_4868_, 2);
lean_inc(v_bytes_4913_);
lean_dec_ref_known(v_w_4868_, 3);
v_key_4914_ = lean_ctor_get(v_pending_4908_, 0);
lean_inc_ref(v_key_4914_);
v_value_4915_ = lean_ctor_get(v_pending_4908_, 1);
lean_inc(v_value_4915_);
v_rest_4916_ = lean_ctor_get(v_pending_4908_, 2);
lean_inc(v_rest_4916_);
lean_dec_ref_known(v_pending_4908_, 3);
v___x_4917_ = lean_apply_5(v_h__9_4877_, v_key_4914_, v_value_4915_, v_rest_4916_, v_acc_4912_, v_bytes_4913_);
return v___x_4917_;
}
}
case 3:
{
lean_object* v_pending_4918_; 
lean_dec(v_h__17_4885_);
lean_dec(v_h__16_4884_);
lean_dec(v_h__15_4883_);
lean_dec(v_h__14_4882_);
lean_dec(v_h__13_4881_);
lean_dec(v_h__12_4880_);
lean_dec(v_h__9_4877_);
lean_dec(v_h__8_4876_);
lean_dec(v_h__7_4875_);
lean_dec(v_h__6_4874_);
lean_dec(v_h__5_4873_);
lean_dec(v_h__4_4872_);
lean_dec(v_h__3_4871_);
lean_dec(v_h__2_4870_);
lean_dec(v_h__1_4869_);
v_pending_4918_ = lean_ctor_get(v_w_4868_, 1);
if (lean_obj_tag(v_pending_4918_) == 0)
{
uint8_t v_want_4919_; lean_object* v_op_4920_; lean_object* v_idx_4921_; lean_object* v___x_4922_; lean_object* v___x_4923_; 
lean_dec(v_h__11_4879_);
v_want_4919_ = lean_ctor_get_uint8(v_w_4868_, sizeof(void*)*3);
v_op_4920_ = lean_ctor_get(v_w_4868_, 0);
lean_inc_ref(v_op_4920_);
v_idx_4921_ = lean_ctor_get(v_w_4868_, 2);
lean_inc(v_idx_4921_);
lean_dec_ref_known(v_w_4868_, 3);
v___x_4922_ = lean_box(v_want_4919_);
v___x_4923_ = lean_apply_3(v_h__10_4878_, v___x_4922_, v_op_4920_, v_idx_4921_);
return v___x_4923_;
}
else
{
uint8_t v_want_4924_; lean_object* v_op_4925_; lean_object* v_idx_4926_; lean_object* v_value_4927_; lean_object* v_rest_4928_; lean_object* v___x_4929_; lean_object* v___x_4930_; 
lean_inc_ref(v_pending_4918_);
lean_dec(v_h__10_4878_);
v_want_4924_ = lean_ctor_get_uint8(v_w_4868_, sizeof(void*)*3);
v_op_4925_ = lean_ctor_get(v_w_4868_, 0);
lean_inc_ref(v_op_4925_);
v_idx_4926_ = lean_ctor_get(v_w_4868_, 2);
lean_inc(v_idx_4926_);
lean_dec_ref_known(v_w_4868_, 3);
v_value_4927_ = lean_ctor_get(v_pending_4918_, 0);
lean_inc(v_value_4927_);
v_rest_4928_ = lean_ctor_get(v_pending_4918_, 1);
lean_inc(v_rest_4928_);
lean_dec_ref_known(v_pending_4918_, 2);
v___x_4929_ = lean_box(v_want_4924_);
v___x_4930_ = lean_apply_5(v_h__11_4879_, v___x_4929_, v_op_4925_, v_value_4927_, v_rest_4928_, v_idx_4926_);
return v___x_4930_;
}
}
case 4:
{
lean_object* v_pending_4931_; 
lean_dec(v_h__17_4885_);
lean_dec(v_h__16_4884_);
lean_dec(v_h__15_4883_);
lean_dec(v_h__14_4882_);
lean_dec(v_h__11_4879_);
lean_dec(v_h__10_4878_);
lean_dec(v_h__9_4877_);
lean_dec(v_h__8_4876_);
lean_dec(v_h__7_4875_);
lean_dec(v_h__6_4874_);
lean_dec(v_h__5_4873_);
lean_dec(v_h__4_4872_);
lean_dec(v_h__3_4871_);
lean_dec(v_h__2_4870_);
lean_dec(v_h__1_4869_);
v_pending_4931_ = lean_ctor_get(v_w_4868_, 2);
if (lean_obj_tag(v_pending_4931_) == 0)
{
lean_object* v_op_4932_; lean_object* v_cur_4933_; lean_object* v_step_4934_; lean_object* v___x_4935_; 
lean_dec(v_h__13_4881_);
v_op_4932_ = lean_ctor_get(v_w_4868_, 0);
lean_inc_ref(v_op_4932_);
v_cur_4933_ = lean_ctor_get(v_w_4868_, 1);
lean_inc(v_cur_4933_);
v_step_4934_ = lean_ctor_get(v_w_4868_, 3);
lean_inc(v_step_4934_);
lean_dec_ref_known(v_w_4868_, 4);
v___x_4935_ = lean_apply_3(v_h__12_4880_, v_op_4932_, v_cur_4933_, v_step_4934_);
return v___x_4935_;
}
else
{
lean_object* v_op_4936_; lean_object* v_cur_4937_; lean_object* v_step_4938_; lean_object* v_value_4939_; lean_object* v_rest_4940_; lean_object* v___x_4941_; 
lean_inc_ref(v_pending_4931_);
lean_dec(v_h__12_4880_);
v_op_4936_ = lean_ctor_get(v_w_4868_, 0);
lean_inc_ref(v_op_4936_);
v_cur_4937_ = lean_ctor_get(v_w_4868_, 1);
lean_inc(v_cur_4937_);
v_step_4938_ = lean_ctor_get(v_w_4868_, 3);
lean_inc(v_step_4938_);
lean_dec_ref_known(v_w_4868_, 4);
v_value_4939_ = lean_ctor_get(v_pending_4931_, 0);
lean_inc(v_value_4939_);
v_rest_4940_ = lean_ctor_get(v_pending_4931_, 1);
lean_inc(v_rest_4940_);
lean_dec_ref_known(v_pending_4931_, 2);
v___x_4941_ = lean_apply_5(v_h__13_4881_, v_op_4936_, v_cur_4937_, v_value_4939_, v_rest_4940_, v_step_4938_);
return v___x_4941_;
}
}
case 5:
{
lean_object* v_pending_4942_; 
lean_dec(v_h__17_4885_);
lean_dec(v_h__16_4884_);
lean_dec(v_h__13_4881_);
lean_dec(v_h__12_4880_);
lean_dec(v_h__11_4879_);
lean_dec(v_h__10_4878_);
lean_dec(v_h__9_4877_);
lean_dec(v_h__8_4876_);
lean_dec(v_h__7_4875_);
lean_dec(v_h__6_4874_);
lean_dec(v_h__5_4873_);
lean_dec(v_h__4_4872_);
lean_dec(v_h__3_4871_);
lean_dec(v_h__2_4870_);
lean_dec(v_h__1_4869_);
v_pending_4942_ = lean_ctor_get(v_w_4868_, 3);
if (lean_obj_tag(v_pending_4942_) == 0)
{
uint8_t v_isMap_4943_; lean_object* v_op_4944_; lean_object* v_name_4945_; lean_object* v_body_4946_; lean_object* v_acc_4947_; lean_object* v_bytes_4948_; lean_object* v_idx_4949_; lean_object* v___x_4950_; lean_object* v___x_4951_; 
lean_dec(v_h__15_4883_);
v_isMap_4943_ = lean_ctor_get_uint8(v_w_4868_, sizeof(void*)*7);
v_op_4944_ = lean_ctor_get(v_w_4868_, 0);
lean_inc_ref(v_op_4944_);
v_name_4945_ = lean_ctor_get(v_w_4868_, 1);
lean_inc_ref(v_name_4945_);
v_body_4946_ = lean_ctor_get(v_w_4868_, 2);
lean_inc(v_body_4946_);
v_acc_4947_ = lean_ctor_get(v_w_4868_, 4);
lean_inc(v_acc_4947_);
v_bytes_4948_ = lean_ctor_get(v_w_4868_, 5);
lean_inc(v_bytes_4948_);
v_idx_4949_ = lean_ctor_get(v_w_4868_, 6);
lean_inc(v_idx_4949_);
lean_dec_ref_known(v_w_4868_, 7);
v___x_4950_ = lean_box(v_isMap_4943_);
v___x_4951_ = lean_apply_7(v_h__14_4882_, v___x_4950_, v_op_4944_, v_name_4945_, v_body_4946_, v_acc_4947_, v_bytes_4948_, v_idx_4949_);
return v___x_4951_;
}
else
{
uint8_t v_isMap_4952_; lean_object* v_op_4953_; lean_object* v_name_4954_; lean_object* v_body_4955_; lean_object* v_acc_4956_; lean_object* v_bytes_4957_; lean_object* v_idx_4958_; lean_object* v_value_4959_; lean_object* v_rest_4960_; lean_object* v___x_4961_; lean_object* v___x_4962_; 
lean_inc_ref(v_pending_4942_);
lean_dec(v_h__14_4882_);
v_isMap_4952_ = lean_ctor_get_uint8(v_w_4868_, sizeof(void*)*7);
v_op_4953_ = lean_ctor_get(v_w_4868_, 0);
lean_inc_ref(v_op_4953_);
v_name_4954_ = lean_ctor_get(v_w_4868_, 1);
lean_inc_ref(v_name_4954_);
v_body_4955_ = lean_ctor_get(v_w_4868_, 2);
lean_inc(v_body_4955_);
v_acc_4956_ = lean_ctor_get(v_w_4868_, 4);
lean_inc(v_acc_4956_);
v_bytes_4957_ = lean_ctor_get(v_w_4868_, 5);
lean_inc(v_bytes_4957_);
v_idx_4958_ = lean_ctor_get(v_w_4868_, 6);
lean_inc(v_idx_4958_);
lean_dec_ref_known(v_w_4868_, 7);
v_value_4959_ = lean_ctor_get(v_pending_4942_, 0);
lean_inc(v_value_4959_);
v_rest_4960_ = lean_ctor_get(v_pending_4942_, 1);
lean_inc(v_rest_4960_);
lean_dec_ref_known(v_pending_4942_, 2);
v___x_4961_ = lean_box(v_isMap_4952_);
v___x_4962_ = lean_apply_9(v_h__15_4883_, v___x_4961_, v_op_4953_, v_name_4954_, v_body_4955_, v_value_4959_, v_rest_4960_, v_acc_4956_, v_bytes_4957_, v_idx_4958_);
return v___x_4962_;
}
}
default: 
{
lean_object* v_pending_4963_; 
lean_dec(v_h__15_4883_);
lean_dec(v_h__14_4882_);
lean_dec(v_h__13_4881_);
lean_dec(v_h__12_4880_);
lean_dec(v_h__11_4879_);
lean_dec(v_h__10_4878_);
lean_dec(v_h__9_4877_);
lean_dec(v_h__8_4876_);
lean_dec(v_h__7_4875_);
lean_dec(v_h__6_4874_);
lean_dec(v_h__5_4873_);
lean_dec(v_h__4_4872_);
lean_dec(v_h__3_4871_);
lean_dec(v_h__2_4870_);
lean_dec(v_h__1_4869_);
v_pending_4963_ = lean_ctor_get(v_w_4868_, 4);
if (lean_obj_tag(v_pending_4963_) == 0)
{
lean_object* v_accName_4964_; lean_object* v_itemName_4965_; lean_object* v_body_4966_; lean_object* v_acc_4967_; lean_object* v___x_4968_; 
lean_dec(v_h__17_4885_);
v_accName_4964_ = lean_ctor_get(v_w_4868_, 0);
lean_inc_ref(v_accName_4964_);
v_itemName_4965_ = lean_ctor_get(v_w_4868_, 1);
lean_inc_ref(v_itemName_4965_);
v_body_4966_ = lean_ctor_get(v_w_4868_, 2);
lean_inc(v_body_4966_);
v_acc_4967_ = lean_ctor_get(v_w_4868_, 3);
lean_inc(v_acc_4967_);
lean_dec_ref_known(v_w_4868_, 5);
v___x_4968_ = lean_apply_4(v_h__16_4884_, v_accName_4964_, v_itemName_4965_, v_body_4966_, v_acc_4967_);
return v___x_4968_;
}
else
{
lean_object* v_accName_4969_; lean_object* v_itemName_4970_; lean_object* v_body_4971_; lean_object* v_acc_4972_; lean_object* v_value_4973_; lean_object* v_rest_4974_; lean_object* v___x_4975_; 
lean_inc_ref(v_pending_4963_);
lean_dec(v_h__16_4884_);
v_accName_4969_ = lean_ctor_get(v_w_4868_, 0);
lean_inc_ref(v_accName_4969_);
v_itemName_4970_ = lean_ctor_get(v_w_4868_, 1);
lean_inc_ref(v_itemName_4970_);
v_body_4971_ = lean_ctor_get(v_w_4868_, 2);
lean_inc(v_body_4971_);
v_acc_4972_ = lean_ctor_get(v_w_4868_, 3);
lean_inc(v_acc_4972_);
lean_dec_ref_known(v_w_4868_, 5);
v_value_4973_ = lean_ctor_get(v_pending_4963_, 0);
lean_inc(v_value_4973_);
v_rest_4974_ = lean_ctor_get(v_pending_4963_, 1);
lean_inc(v_rest_4974_);
lean_dec_ref_known(v_pending_4963_, 2);
v___x_4975_ = lean_apply_6(v_h__17_4885_, v_accName_4969_, v_itemName_4970_, v_body_4971_, v_acc_4972_, v_value_4973_, v_rest_4974_);
return v___x_4975_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__44_splitter___redArg___boxed(lean_object** _args){
lean_object* v_w_4976_ = _args[0];
lean_object* v_h__1_4977_ = _args[1];
lean_object* v_h__2_4978_ = _args[2];
lean_object* v_h__3_4979_ = _args[3];
lean_object* v_h__4_4980_ = _args[4];
lean_object* v_h__5_4981_ = _args[5];
lean_object* v_h__6_4982_ = _args[6];
lean_object* v_h__7_4983_ = _args[7];
lean_object* v_h__8_4984_ = _args[8];
lean_object* v_h__9_4985_ = _args[9];
lean_object* v_h__10_4986_ = _args[10];
lean_object* v_h__11_4987_ = _args[11];
lean_object* v_h__12_4988_ = _args[12];
lean_object* v_h__13_4989_ = _args[13];
lean_object* v_h__14_4990_ = _args[14];
lean_object* v_h__15_4991_ = _args[15];
lean_object* v_h__16_4992_ = _args[16];
lean_object* v_h__17_4993_ = _args[17];
_start:
{
lean_object* v_res_4994_; 
v_res_4994_ = lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__44_splitter___redArg(v_w_4976_, v_h__1_4977_, v_h__2_4978_, v_h__3_4979_, v_h__4_4980_, v_h__5_4981_, v_h__6_4982_, v_h__7_4983_, v_h__8_4984_, v_h__9_4985_, v_h__10_4986_, v_h__11_4987_, v_h__12_4988_, v_h__13_4989_, v_h__14_4990_, v_h__15_4991_, v_h__16_4992_, v_h__17_4993_);
return v_res_4994_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__44_splitter(lean_object* v_motive_4995_, lean_object* v_w_4996_, lean_object* v_h__1_4997_, lean_object* v_h__2_4998_, lean_object* v_h__3_4999_, lean_object* v_h__4_5000_, lean_object* v_h__5_5001_, lean_object* v_h__6_5002_, lean_object* v_h__7_5003_, lean_object* v_h__8_5004_, lean_object* v_h__9_5005_, lean_object* v_h__10_5006_, lean_object* v_h__11_5007_, lean_object* v_h__12_5008_, lean_object* v_h__13_5009_, lean_object* v_h__14_5010_, lean_object* v_h__15_5011_, lean_object* v_h__16_5012_, lean_object* v_h__17_5013_){
_start:
{
switch(lean_obj_tag(v_w_4996_))
{
case 0:
{
lean_object* v_v_5014_; 
lean_dec(v_h__17_5013_);
lean_dec(v_h__16_5012_);
lean_dec(v_h__15_5011_);
lean_dec(v_h__14_5010_);
lean_dec(v_h__13_5009_);
lean_dec(v_h__12_5008_);
lean_dec(v_h__11_5007_);
lean_dec(v_h__10_5006_);
lean_dec(v_h__9_5005_);
lean_dec(v_h__8_5004_);
lean_dec(v_h__7_5003_);
lean_dec(v_h__6_5002_);
v_v_5014_ = lean_ctor_get(v_w_4996_, 0);
lean_inc(v_v_5014_);
lean_dec_ref_known(v_w_4996_, 1);
switch(lean_obj_tag(v_v_5014_))
{
case 5:
{
lean_object* v_fields_5015_; lean_object* v___x_5016_; 
lean_dec(v_h__5_5001_);
lean_dec(v_h__4_5000_);
lean_dec(v_h__3_4999_);
lean_dec(v_h__2_4998_);
v_fields_5015_ = lean_ctor_get(v_v_5014_, 0);
lean_inc(v_fields_5015_);
lean_dec_ref_known(v_v_5014_, 1);
v___x_5016_ = lean_apply_1(v_h__1_4997_, v_fields_5015_);
return v___x_5016_;
}
case 4:
{
lean_object* v_values_5017_; 
lean_dec(v_h__5_5001_);
lean_dec(v_h__1_4997_);
v_values_5017_ = lean_ctor_get(v_v_5014_, 0);
lean_inc(v_values_5017_);
lean_dec_ref_known(v_v_5014_, 1);
if (lean_obj_tag(v_values_5017_) == 0)
{
lean_object* v___x_5018_; lean_object* v___x_5019_; 
lean_dec(v_h__4_5000_);
lean_dec(v_h__2_4998_);
v___x_5018_ = lean_box(0);
v___x_5019_ = lean_apply_1(v_h__3_4999_, v___x_5018_);
return v___x_5019_;
}
else
{
lean_object* v_value_5020_; 
lean_dec(v_h__3_4999_);
v_value_5020_ = lean_ctor_get(v_values_5017_, 0);
lean_inc(v_value_5020_);
if (lean_obj_tag(v_value_5020_) == 3)
{
lean_object* v_rest_5021_; lean_object* v_value_5022_; lean_object* v___x_5023_; 
lean_dec(v_h__4_5000_);
v_rest_5021_ = lean_ctor_get(v_values_5017_, 1);
lean_inc(v_rest_5021_);
lean_dec_ref_known(v_values_5017_, 2);
v_value_5022_ = lean_ctor_get(v_value_5020_, 0);
lean_inc_ref(v_value_5022_);
lean_dec_ref_known(v_value_5020_, 1);
v___x_5023_ = lean_apply_2(v_h__2_4998_, v_value_5022_, v_rest_5021_);
return v___x_5023_;
}
else
{
lean_object* v_rest_5024_; lean_object* v___x_5025_; 
lean_dec(v_h__2_4998_);
v_rest_5024_ = lean_ctor_get(v_values_5017_, 1);
lean_inc(v_rest_5024_);
lean_dec_ref_known(v_values_5017_, 2);
v___x_5025_ = lean_apply_3(v_h__4_5000_, v_value_5020_, v_rest_5024_, lean_box(0));
return v___x_5025_;
}
}
}
default: 
{
lean_object* v___x_5026_; 
lean_dec(v_h__4_5000_);
lean_dec(v_h__3_4999_);
lean_dec(v_h__2_4998_);
lean_dec(v_h__1_4997_);
v___x_5026_ = lean_apply_5(v_h__5_5001_, v_v_5014_, lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_5026_;
}
}
}
case 1:
{
lean_object* v_pending_5027_; 
lean_dec(v_h__17_5013_);
lean_dec(v_h__16_5012_);
lean_dec(v_h__15_5011_);
lean_dec(v_h__14_5010_);
lean_dec(v_h__13_5009_);
lean_dec(v_h__12_5008_);
lean_dec(v_h__11_5007_);
lean_dec(v_h__10_5006_);
lean_dec(v_h__9_5005_);
lean_dec(v_h__8_5004_);
lean_dec(v_h__5_5001_);
lean_dec(v_h__4_5000_);
lean_dec(v_h__3_4999_);
lean_dec(v_h__2_4998_);
lean_dec(v_h__1_4997_);
v_pending_5027_ = lean_ctor_get(v_w_4996_, 0);
if (lean_obj_tag(v_pending_5027_) == 0)
{
lean_object* v_acc_5028_; lean_object* v_bytes_5029_; lean_object* v___x_5030_; 
lean_dec(v_h__7_5003_);
v_acc_5028_ = lean_ctor_get(v_w_4996_, 1);
lean_inc(v_acc_5028_);
v_bytes_5029_ = lean_ctor_get(v_w_4996_, 2);
lean_inc(v_bytes_5029_);
lean_dec_ref_known(v_w_4996_, 3);
v___x_5030_ = lean_apply_2(v_h__6_5002_, v_acc_5028_, v_bytes_5029_);
return v___x_5030_;
}
else
{
lean_object* v_acc_5031_; lean_object* v_bytes_5032_; lean_object* v_value_5033_; lean_object* v_rest_5034_; lean_object* v___x_5035_; 
lean_inc_ref(v_pending_5027_);
lean_dec(v_h__6_5002_);
v_acc_5031_ = lean_ctor_get(v_w_4996_, 1);
lean_inc(v_acc_5031_);
v_bytes_5032_ = lean_ctor_get(v_w_4996_, 2);
lean_inc(v_bytes_5032_);
lean_dec_ref_known(v_w_4996_, 3);
v_value_5033_ = lean_ctor_get(v_pending_5027_, 0);
lean_inc(v_value_5033_);
v_rest_5034_ = lean_ctor_get(v_pending_5027_, 1);
lean_inc(v_rest_5034_);
lean_dec_ref_known(v_pending_5027_, 2);
v___x_5035_ = lean_apply_4(v_h__7_5003_, v_value_5033_, v_rest_5034_, v_acc_5031_, v_bytes_5032_);
return v___x_5035_;
}
}
case 2:
{
lean_object* v_pending_5036_; 
lean_dec(v_h__17_5013_);
lean_dec(v_h__16_5012_);
lean_dec(v_h__15_5011_);
lean_dec(v_h__14_5010_);
lean_dec(v_h__13_5009_);
lean_dec(v_h__12_5008_);
lean_dec(v_h__11_5007_);
lean_dec(v_h__10_5006_);
lean_dec(v_h__7_5003_);
lean_dec(v_h__6_5002_);
lean_dec(v_h__5_5001_);
lean_dec(v_h__4_5000_);
lean_dec(v_h__3_4999_);
lean_dec(v_h__2_4998_);
lean_dec(v_h__1_4997_);
v_pending_5036_ = lean_ctor_get(v_w_4996_, 0);
if (lean_obj_tag(v_pending_5036_) == 0)
{
lean_object* v_acc_5037_; lean_object* v_bytes_5038_; lean_object* v___x_5039_; 
lean_dec(v_h__9_5005_);
v_acc_5037_ = lean_ctor_get(v_w_4996_, 1);
lean_inc(v_acc_5037_);
v_bytes_5038_ = lean_ctor_get(v_w_4996_, 2);
lean_inc(v_bytes_5038_);
lean_dec_ref_known(v_w_4996_, 3);
v___x_5039_ = lean_apply_2(v_h__8_5004_, v_acc_5037_, v_bytes_5038_);
return v___x_5039_;
}
else
{
lean_object* v_acc_5040_; lean_object* v_bytes_5041_; lean_object* v_key_5042_; lean_object* v_value_5043_; lean_object* v_rest_5044_; lean_object* v___x_5045_; 
lean_inc_ref(v_pending_5036_);
lean_dec(v_h__8_5004_);
v_acc_5040_ = lean_ctor_get(v_w_4996_, 1);
lean_inc(v_acc_5040_);
v_bytes_5041_ = lean_ctor_get(v_w_4996_, 2);
lean_inc(v_bytes_5041_);
lean_dec_ref_known(v_w_4996_, 3);
v_key_5042_ = lean_ctor_get(v_pending_5036_, 0);
lean_inc_ref(v_key_5042_);
v_value_5043_ = lean_ctor_get(v_pending_5036_, 1);
lean_inc(v_value_5043_);
v_rest_5044_ = lean_ctor_get(v_pending_5036_, 2);
lean_inc(v_rest_5044_);
lean_dec_ref_known(v_pending_5036_, 3);
v___x_5045_ = lean_apply_5(v_h__9_5005_, v_key_5042_, v_value_5043_, v_rest_5044_, v_acc_5040_, v_bytes_5041_);
return v___x_5045_;
}
}
case 3:
{
lean_object* v_pending_5046_; 
lean_dec(v_h__17_5013_);
lean_dec(v_h__16_5012_);
lean_dec(v_h__15_5011_);
lean_dec(v_h__14_5010_);
lean_dec(v_h__13_5009_);
lean_dec(v_h__12_5008_);
lean_dec(v_h__9_5005_);
lean_dec(v_h__8_5004_);
lean_dec(v_h__7_5003_);
lean_dec(v_h__6_5002_);
lean_dec(v_h__5_5001_);
lean_dec(v_h__4_5000_);
lean_dec(v_h__3_4999_);
lean_dec(v_h__2_4998_);
lean_dec(v_h__1_4997_);
v_pending_5046_ = lean_ctor_get(v_w_4996_, 1);
if (lean_obj_tag(v_pending_5046_) == 0)
{
uint8_t v_want_5047_; lean_object* v_op_5048_; lean_object* v_idx_5049_; lean_object* v___x_5050_; lean_object* v___x_5051_; 
lean_dec(v_h__11_5007_);
v_want_5047_ = lean_ctor_get_uint8(v_w_4996_, sizeof(void*)*3);
v_op_5048_ = lean_ctor_get(v_w_4996_, 0);
lean_inc_ref(v_op_5048_);
v_idx_5049_ = lean_ctor_get(v_w_4996_, 2);
lean_inc(v_idx_5049_);
lean_dec_ref_known(v_w_4996_, 3);
v___x_5050_ = lean_box(v_want_5047_);
v___x_5051_ = lean_apply_3(v_h__10_5006_, v___x_5050_, v_op_5048_, v_idx_5049_);
return v___x_5051_;
}
else
{
uint8_t v_want_5052_; lean_object* v_op_5053_; lean_object* v_idx_5054_; lean_object* v_value_5055_; lean_object* v_rest_5056_; lean_object* v___x_5057_; lean_object* v___x_5058_; 
lean_inc_ref(v_pending_5046_);
lean_dec(v_h__10_5006_);
v_want_5052_ = lean_ctor_get_uint8(v_w_4996_, sizeof(void*)*3);
v_op_5053_ = lean_ctor_get(v_w_4996_, 0);
lean_inc_ref(v_op_5053_);
v_idx_5054_ = lean_ctor_get(v_w_4996_, 2);
lean_inc(v_idx_5054_);
lean_dec_ref_known(v_w_4996_, 3);
v_value_5055_ = lean_ctor_get(v_pending_5046_, 0);
lean_inc(v_value_5055_);
v_rest_5056_ = lean_ctor_get(v_pending_5046_, 1);
lean_inc(v_rest_5056_);
lean_dec_ref_known(v_pending_5046_, 2);
v___x_5057_ = lean_box(v_want_5052_);
v___x_5058_ = lean_apply_5(v_h__11_5007_, v___x_5057_, v_op_5053_, v_value_5055_, v_rest_5056_, v_idx_5054_);
return v___x_5058_;
}
}
case 4:
{
lean_object* v_pending_5059_; 
lean_dec(v_h__17_5013_);
lean_dec(v_h__16_5012_);
lean_dec(v_h__15_5011_);
lean_dec(v_h__14_5010_);
lean_dec(v_h__11_5007_);
lean_dec(v_h__10_5006_);
lean_dec(v_h__9_5005_);
lean_dec(v_h__8_5004_);
lean_dec(v_h__7_5003_);
lean_dec(v_h__6_5002_);
lean_dec(v_h__5_5001_);
lean_dec(v_h__4_5000_);
lean_dec(v_h__3_4999_);
lean_dec(v_h__2_4998_);
lean_dec(v_h__1_4997_);
v_pending_5059_ = lean_ctor_get(v_w_4996_, 2);
if (lean_obj_tag(v_pending_5059_) == 0)
{
lean_object* v_op_5060_; lean_object* v_cur_5061_; lean_object* v_step_5062_; lean_object* v___x_5063_; 
lean_dec(v_h__13_5009_);
v_op_5060_ = lean_ctor_get(v_w_4996_, 0);
lean_inc_ref(v_op_5060_);
v_cur_5061_ = lean_ctor_get(v_w_4996_, 1);
lean_inc(v_cur_5061_);
v_step_5062_ = lean_ctor_get(v_w_4996_, 3);
lean_inc(v_step_5062_);
lean_dec_ref_known(v_w_4996_, 4);
v___x_5063_ = lean_apply_3(v_h__12_5008_, v_op_5060_, v_cur_5061_, v_step_5062_);
return v___x_5063_;
}
else
{
lean_object* v_op_5064_; lean_object* v_cur_5065_; lean_object* v_step_5066_; lean_object* v_value_5067_; lean_object* v_rest_5068_; lean_object* v___x_5069_; 
lean_inc_ref(v_pending_5059_);
lean_dec(v_h__12_5008_);
v_op_5064_ = lean_ctor_get(v_w_4996_, 0);
lean_inc_ref(v_op_5064_);
v_cur_5065_ = lean_ctor_get(v_w_4996_, 1);
lean_inc(v_cur_5065_);
v_step_5066_ = lean_ctor_get(v_w_4996_, 3);
lean_inc(v_step_5066_);
lean_dec_ref_known(v_w_4996_, 4);
v_value_5067_ = lean_ctor_get(v_pending_5059_, 0);
lean_inc(v_value_5067_);
v_rest_5068_ = lean_ctor_get(v_pending_5059_, 1);
lean_inc(v_rest_5068_);
lean_dec_ref_known(v_pending_5059_, 2);
v___x_5069_ = lean_apply_5(v_h__13_5009_, v_op_5064_, v_cur_5065_, v_value_5067_, v_rest_5068_, v_step_5066_);
return v___x_5069_;
}
}
case 5:
{
lean_object* v_pending_5070_; 
lean_dec(v_h__17_5013_);
lean_dec(v_h__16_5012_);
lean_dec(v_h__13_5009_);
lean_dec(v_h__12_5008_);
lean_dec(v_h__11_5007_);
lean_dec(v_h__10_5006_);
lean_dec(v_h__9_5005_);
lean_dec(v_h__8_5004_);
lean_dec(v_h__7_5003_);
lean_dec(v_h__6_5002_);
lean_dec(v_h__5_5001_);
lean_dec(v_h__4_5000_);
lean_dec(v_h__3_4999_);
lean_dec(v_h__2_4998_);
lean_dec(v_h__1_4997_);
v_pending_5070_ = lean_ctor_get(v_w_4996_, 3);
if (lean_obj_tag(v_pending_5070_) == 0)
{
uint8_t v_isMap_5071_; lean_object* v_op_5072_; lean_object* v_name_5073_; lean_object* v_body_5074_; lean_object* v_acc_5075_; lean_object* v_bytes_5076_; lean_object* v_idx_5077_; lean_object* v___x_5078_; lean_object* v___x_5079_; 
lean_dec(v_h__15_5011_);
v_isMap_5071_ = lean_ctor_get_uint8(v_w_4996_, sizeof(void*)*7);
v_op_5072_ = lean_ctor_get(v_w_4996_, 0);
lean_inc_ref(v_op_5072_);
v_name_5073_ = lean_ctor_get(v_w_4996_, 1);
lean_inc_ref(v_name_5073_);
v_body_5074_ = lean_ctor_get(v_w_4996_, 2);
lean_inc(v_body_5074_);
v_acc_5075_ = lean_ctor_get(v_w_4996_, 4);
lean_inc(v_acc_5075_);
v_bytes_5076_ = lean_ctor_get(v_w_4996_, 5);
lean_inc(v_bytes_5076_);
v_idx_5077_ = lean_ctor_get(v_w_4996_, 6);
lean_inc(v_idx_5077_);
lean_dec_ref_known(v_w_4996_, 7);
v___x_5078_ = lean_box(v_isMap_5071_);
v___x_5079_ = lean_apply_7(v_h__14_5010_, v___x_5078_, v_op_5072_, v_name_5073_, v_body_5074_, v_acc_5075_, v_bytes_5076_, v_idx_5077_);
return v___x_5079_;
}
else
{
uint8_t v_isMap_5080_; lean_object* v_op_5081_; lean_object* v_name_5082_; lean_object* v_body_5083_; lean_object* v_acc_5084_; lean_object* v_bytes_5085_; lean_object* v_idx_5086_; lean_object* v_value_5087_; lean_object* v_rest_5088_; lean_object* v___x_5089_; lean_object* v___x_5090_; 
lean_inc_ref(v_pending_5070_);
lean_dec(v_h__14_5010_);
v_isMap_5080_ = lean_ctor_get_uint8(v_w_4996_, sizeof(void*)*7);
v_op_5081_ = lean_ctor_get(v_w_4996_, 0);
lean_inc_ref(v_op_5081_);
v_name_5082_ = lean_ctor_get(v_w_4996_, 1);
lean_inc_ref(v_name_5082_);
v_body_5083_ = lean_ctor_get(v_w_4996_, 2);
lean_inc(v_body_5083_);
v_acc_5084_ = lean_ctor_get(v_w_4996_, 4);
lean_inc(v_acc_5084_);
v_bytes_5085_ = lean_ctor_get(v_w_4996_, 5);
lean_inc(v_bytes_5085_);
v_idx_5086_ = lean_ctor_get(v_w_4996_, 6);
lean_inc(v_idx_5086_);
lean_dec_ref_known(v_w_4996_, 7);
v_value_5087_ = lean_ctor_get(v_pending_5070_, 0);
lean_inc(v_value_5087_);
v_rest_5088_ = lean_ctor_get(v_pending_5070_, 1);
lean_inc(v_rest_5088_);
lean_dec_ref_known(v_pending_5070_, 2);
v___x_5089_ = lean_box(v_isMap_5080_);
v___x_5090_ = lean_apply_9(v_h__15_5011_, v___x_5089_, v_op_5081_, v_name_5082_, v_body_5083_, v_value_5087_, v_rest_5088_, v_acc_5084_, v_bytes_5085_, v_idx_5086_);
return v___x_5090_;
}
}
default: 
{
lean_object* v_pending_5091_; 
lean_dec(v_h__15_5011_);
lean_dec(v_h__14_5010_);
lean_dec(v_h__13_5009_);
lean_dec(v_h__12_5008_);
lean_dec(v_h__11_5007_);
lean_dec(v_h__10_5006_);
lean_dec(v_h__9_5005_);
lean_dec(v_h__8_5004_);
lean_dec(v_h__7_5003_);
lean_dec(v_h__6_5002_);
lean_dec(v_h__5_5001_);
lean_dec(v_h__4_5000_);
lean_dec(v_h__3_4999_);
lean_dec(v_h__2_4998_);
lean_dec(v_h__1_4997_);
v_pending_5091_ = lean_ctor_get(v_w_4996_, 4);
if (lean_obj_tag(v_pending_5091_) == 0)
{
lean_object* v_accName_5092_; lean_object* v_itemName_5093_; lean_object* v_body_5094_; lean_object* v_acc_5095_; lean_object* v___x_5096_; 
lean_dec(v_h__17_5013_);
v_accName_5092_ = lean_ctor_get(v_w_4996_, 0);
lean_inc_ref(v_accName_5092_);
v_itemName_5093_ = lean_ctor_get(v_w_4996_, 1);
lean_inc_ref(v_itemName_5093_);
v_body_5094_ = lean_ctor_get(v_w_4996_, 2);
lean_inc(v_body_5094_);
v_acc_5095_ = lean_ctor_get(v_w_4996_, 3);
lean_inc(v_acc_5095_);
lean_dec_ref_known(v_w_4996_, 5);
v___x_5096_ = lean_apply_4(v_h__16_5012_, v_accName_5092_, v_itemName_5093_, v_body_5094_, v_acc_5095_);
return v___x_5096_;
}
else
{
lean_object* v_accName_5097_; lean_object* v_itemName_5098_; lean_object* v_body_5099_; lean_object* v_acc_5100_; lean_object* v_value_5101_; lean_object* v_rest_5102_; lean_object* v___x_5103_; 
lean_inc_ref(v_pending_5091_);
lean_dec(v_h__16_5012_);
v_accName_5097_ = lean_ctor_get(v_w_4996_, 0);
lean_inc_ref(v_accName_5097_);
v_itemName_5098_ = lean_ctor_get(v_w_4996_, 1);
lean_inc_ref(v_itemName_5098_);
v_body_5099_ = lean_ctor_get(v_w_4996_, 2);
lean_inc(v_body_5099_);
v_acc_5100_ = lean_ctor_get(v_w_4996_, 3);
lean_inc(v_acc_5100_);
lean_dec_ref_known(v_w_4996_, 5);
v_value_5101_ = lean_ctor_get(v_pending_5091_, 0);
lean_inc(v_value_5101_);
v_rest_5102_ = lean_ctor_get(v_pending_5091_, 1);
lean_inc(v_rest_5102_);
lean_dec_ref_known(v_pending_5091_, 2);
v___x_5103_ = lean_apply_6(v_h__17_5013_, v_accName_5097_, v_itemName_5098_, v_body_5099_, v_acc_5100_, v_value_5101_, v_rest_5102_);
return v___x_5103_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__44_splitter___boxed(lean_object** _args){
lean_object* v_motive_5104_ = _args[0];
lean_object* v_w_5105_ = _args[1];
lean_object* v_h__1_5106_ = _args[2];
lean_object* v_h__2_5107_ = _args[3];
lean_object* v_h__3_5108_ = _args[4];
lean_object* v_h__4_5109_ = _args[5];
lean_object* v_h__5_5110_ = _args[6];
lean_object* v_h__6_5111_ = _args[7];
lean_object* v_h__7_5112_ = _args[8];
lean_object* v_h__8_5113_ = _args[9];
lean_object* v_h__9_5114_ = _args[10];
lean_object* v_h__10_5115_ = _args[11];
lean_object* v_h__11_5116_ = _args[12];
lean_object* v_h__12_5117_ = _args[13];
lean_object* v_h__13_5118_ = _args[14];
lean_object* v_h__14_5119_ = _args[15];
lean_object* v_h__15_5120_ = _args[16];
lean_object* v_h__16_5121_ = _args[17];
lean_object* v_h__17_5122_ = _args[18];
_start:
{
lean_object* v_res_5123_; 
v_res_5123_ = lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__44_splitter(v_motive_5104_, v_w_5105_, v_h__1_5106_, v_h__2_5107_, v_h__3_5108_, v_h__4_5109_, v_h__5_5110_, v_h__6_5111_, v_h__7_5112_, v_h__8_5113_, v_h__9_5114_, v_h__10_5115_, v_h__11_5116_, v_h__12_5117_, v_h__13_5118_, v_h__14_5119_, v_h__15_5120_, v_h__16_5121_, v_h__17_5122_);
return v_res_5123_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg(lean_object* v_op_5170_, lean_object* v_h__1_5171_, lean_object* v_h__2_5172_, lean_object* v_h__3_5173_, lean_object* v_h__4_5174_, lean_object* v_h__5_5175_, lean_object* v_h__6_5176_, lean_object* v_h__7_5177_, lean_object* v_h__8_5178_, lean_object* v_h__9_5179_, lean_object* v_h__10_5180_, lean_object* v_h__11_5181_, lean_object* v_h__12_5182_, lean_object* v_h__13_5183_, lean_object* v_h__14_5184_, lean_object* v_h__15_5185_, lean_object* v_h__16_5186_, lean_object* v_h__17_5187_, lean_object* v_h__18_5188_, lean_object* v_h__19_5189_, lean_object* v_h__20_5190_, lean_object* v_h__21_5191_, lean_object* v_h__22_5192_, lean_object* v_h__23_5193_, lean_object* v_h__24_5194_, lean_object* v_h__25_5195_, lean_object* v_h__26_5196_, lean_object* v_h__27_5197_, lean_object* v_h__28_5198_, lean_object* v_h__29_5199_, lean_object* v_h__30_5200_, lean_object* v_h__31_5201_, lean_object* v_h__32_5202_, lean_object* v_h__33_5203_, lean_object* v_h__34_5204_, lean_object* v_h__35_5205_, lean_object* v_h__36_5206_, lean_object* v_h__37_5207_, lean_object* v_h__38_5208_, lean_object* v_h__39_5209_, lean_object* v_h__40_5210_, lean_object* v_h__41_5211_, lean_object* v_h__42_5212_, lean_object* v_h__43_5213_, lean_object* v_h__44_5214_, lean_object* v_h__45_5215_, lean_object* v_h__46_5216_, lean_object* v_h__47_5217_, lean_object* v_h__48_5218_, lean_object* v_h__49_5219_, lean_object* v_h__50_5220_, lean_object* v_h__51_5221_, lean_object* v_h__52_5222_, lean_object* v_h__53_5223_, lean_object* v_h__54_5224_, lean_object* v_h__55_5225_, lean_object* v_h__56_5226_, lean_object* v_h__57_5227_, lean_object* v_h__58_5228_, lean_object* v_h__59_5229_, lean_object* v_h__60_5230_, lean_object* v_h__61_5231_){
_start:
{
lean_object* v___x_5232_; uint8_t v___x_5233_; 
v___x_5232_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__0));
v___x_5233_ = lean_string_dec_eq(v_op_5170_, v___x_5232_);
if (v___x_5233_ == 0)
{
lean_object* v___x_5234_; uint8_t v___x_5235_; 
lean_dec(v_h__1_5171_);
v___x_5234_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__1));
v___x_5235_ = lean_string_dec_eq(v_op_5170_, v___x_5234_);
if (v___x_5235_ == 0)
{
lean_object* v___x_5236_; uint8_t v___x_5237_; 
lean_dec(v_h__2_5172_);
v___x_5236_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__2));
v___x_5237_ = lean_string_dec_eq(v_op_5170_, v___x_5236_);
if (v___x_5237_ == 0)
{
lean_object* v___x_5238_; uint8_t v___x_5239_; 
lean_dec(v_h__3_5173_);
v___x_5238_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__3));
v___x_5239_ = lean_string_dec_eq(v_op_5170_, v___x_5238_);
if (v___x_5239_ == 0)
{
lean_object* v___x_5240_; uint8_t v___x_5241_; 
lean_dec(v_h__4_5174_);
v___x_5240_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__4));
v___x_5241_ = lean_string_dec_eq(v_op_5170_, v___x_5240_);
if (v___x_5241_ == 0)
{
lean_object* v___x_5242_; uint8_t v___x_5243_; 
lean_dec(v_h__5_5175_);
v___x_5242_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__5));
v___x_5243_ = lean_string_dec_eq(v_op_5170_, v___x_5242_);
if (v___x_5243_ == 0)
{
lean_object* v___x_5244_; uint8_t v___x_5245_; 
lean_dec(v_h__6_5176_);
v___x_5244_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__6));
v___x_5245_ = lean_string_dec_eq(v_op_5170_, v___x_5244_);
if (v___x_5245_ == 0)
{
lean_object* v___x_5246_; uint8_t v___x_5247_; 
lean_dec(v_h__7_5177_);
v___x_5246_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__7));
v___x_5247_ = lean_string_dec_eq(v_op_5170_, v___x_5246_);
if (v___x_5247_ == 0)
{
lean_object* v___x_5248_; uint8_t v___x_5249_; 
lean_dec(v_h__8_5178_);
v___x_5248_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__8));
v___x_5249_ = lean_string_dec_eq(v_op_5170_, v___x_5248_);
if (v___x_5249_ == 0)
{
lean_object* v___x_5250_; uint8_t v___x_5251_; 
lean_dec(v_h__9_5179_);
v___x_5250_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__9));
v___x_5251_ = lean_string_dec_eq(v_op_5170_, v___x_5250_);
if (v___x_5251_ == 0)
{
lean_object* v___x_5252_; uint8_t v___x_5253_; 
lean_dec(v_h__10_5180_);
v___x_5252_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__10));
v___x_5253_ = lean_string_dec_eq(v_op_5170_, v___x_5252_);
if (v___x_5253_ == 0)
{
lean_object* v___x_5254_; uint8_t v___x_5255_; 
lean_dec(v_h__11_5181_);
v___x_5254_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__11));
v___x_5255_ = lean_string_dec_eq(v_op_5170_, v___x_5254_);
if (v___x_5255_ == 0)
{
lean_object* v___x_5256_; uint8_t v___x_5257_; 
lean_dec(v_h__12_5182_);
v___x_5256_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__12));
v___x_5257_ = lean_string_dec_eq(v_op_5170_, v___x_5256_);
if (v___x_5257_ == 0)
{
lean_object* v___x_5258_; uint8_t v___x_5259_; 
lean_dec(v_h__13_5183_);
v___x_5258_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__13));
v___x_5259_ = lean_string_dec_eq(v_op_5170_, v___x_5258_);
if (v___x_5259_ == 0)
{
lean_object* v___x_5260_; uint8_t v___x_5261_; 
lean_dec(v_h__14_5184_);
v___x_5260_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__14));
v___x_5261_ = lean_string_dec_eq(v_op_5170_, v___x_5260_);
if (v___x_5261_ == 0)
{
lean_object* v___x_5262_; uint8_t v___x_5263_; 
lean_dec(v_h__15_5185_);
v___x_5262_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__15));
v___x_5263_ = lean_string_dec_eq(v_op_5170_, v___x_5262_);
if (v___x_5263_ == 0)
{
lean_object* v___x_5264_; uint8_t v___x_5265_; 
lean_dec(v_h__16_5186_);
v___x_5264_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__16));
v___x_5265_ = lean_string_dec_eq(v_op_5170_, v___x_5264_);
if (v___x_5265_ == 0)
{
lean_object* v___x_5266_; uint8_t v___x_5267_; 
lean_dec(v_h__17_5187_);
v___x_5266_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__17));
v___x_5267_ = lean_string_dec_eq(v_op_5170_, v___x_5266_);
if (v___x_5267_ == 0)
{
lean_object* v___x_5268_; uint8_t v___x_5269_; 
lean_dec(v_h__18_5188_);
v___x_5268_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__0));
v___x_5269_ = lean_string_dec_eq(v_op_5170_, v___x_5268_);
if (v___x_5269_ == 0)
{
lean_object* v___x_5270_; uint8_t v___x_5271_; 
lean_dec(v_h__19_5189_);
v___x_5270_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__1));
v___x_5271_ = lean_string_dec_eq(v_op_5170_, v___x_5270_);
if (v___x_5271_ == 0)
{
lean_object* v___x_5272_; uint8_t v___x_5273_; 
lean_dec(v_h__20_5190_);
v___x_5272_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__2));
v___x_5273_ = lean_string_dec_eq(v_op_5170_, v___x_5272_);
if (v___x_5273_ == 0)
{
lean_object* v___x_5274_; uint8_t v___x_5275_; 
lean_dec(v_h__21_5191_);
v___x_5274_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__3));
v___x_5275_ = lean_string_dec_eq(v_op_5170_, v___x_5274_);
if (v___x_5275_ == 0)
{
lean_object* v___x_5276_; uint8_t v___x_5277_; 
lean_dec(v_h__22_5192_);
v___x_5276_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__4));
v___x_5277_ = lean_string_dec_eq(v_op_5170_, v___x_5276_);
if (v___x_5277_ == 0)
{
lean_object* v___x_5278_; uint8_t v___x_5279_; 
lean_dec(v_h__23_5193_);
v___x_5278_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__12));
v___x_5279_ = lean_string_dec_eq(v_op_5170_, v___x_5278_);
if (v___x_5279_ == 0)
{
lean_object* v___x_5280_; uint8_t v___x_5281_; 
lean_dec(v_h__24_5194_);
v___x_5280_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asList___closed__0));
v___x_5281_ = lean_string_dec_eq(v_op_5170_, v___x_5280_);
if (v___x_5281_ == 0)
{
lean_object* v___x_5282_; uint8_t v___x_5283_; 
lean_dec(v_h__25_5195_);
v___x_5282_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__18));
v___x_5283_ = lean_string_dec_eq(v_op_5170_, v___x_5282_);
if (v___x_5283_ == 0)
{
lean_object* v___x_5284_; uint8_t v___x_5285_; 
lean_dec(v_h__26_5196_);
v___x_5284_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__19));
v___x_5285_ = lean_string_dec_eq(v_op_5170_, v___x_5284_);
if (v___x_5285_ == 0)
{
lean_object* v___x_5286_; uint8_t v___x_5287_; 
lean_dec(v_h__27_5197_);
v___x_5286_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__20));
v___x_5287_ = lean_string_dec_eq(v_op_5170_, v___x_5286_);
if (v___x_5287_ == 0)
{
lean_object* v___x_5288_; uint8_t v___x_5289_; 
lean_dec(v_h__28_5198_);
v___x_5288_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asMap___closed__0));
v___x_5289_ = lean_string_dec_eq(v_op_5170_, v___x_5288_);
if (v___x_5289_ == 0)
{
lean_object* v___x_5290_; uint8_t v___x_5291_; 
lean_dec(v_h__29_5199_);
v___x_5290_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__21));
v___x_5291_ = lean_string_dec_eq(v_op_5170_, v___x_5290_);
if (v___x_5291_ == 0)
{
lean_object* v___x_5292_; uint8_t v___x_5293_; 
lean_dec(v_h__30_5200_);
v___x_5292_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__22));
v___x_5293_ = lean_string_dec_eq(v_op_5170_, v___x_5292_);
if (v___x_5293_ == 0)
{
lean_object* v___x_5294_; uint8_t v___x_5295_; 
lean_dec(v_h__31_5201_);
v___x_5294_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__23));
v___x_5295_ = lean_string_dec_eq(v_op_5170_, v___x_5294_);
if (v___x_5295_ == 0)
{
lean_object* v___x_5296_; uint8_t v___x_5297_; 
lean_dec(v_h__32_5202_);
v___x_5296_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__24));
v___x_5297_ = lean_string_dec_eq(v_op_5170_, v___x_5296_);
if (v___x_5297_ == 0)
{
lean_object* v___x_5298_; uint8_t v___x_5299_; 
lean_dec(v_h__33_5203_);
v___x_5298_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__25));
v___x_5299_ = lean_string_dec_eq(v_op_5170_, v___x_5298_);
if (v___x_5299_ == 0)
{
lean_object* v___x_5300_; uint8_t v___x_5301_; 
lean_dec(v_h__34_5204_);
v___x_5300_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__26));
v___x_5301_ = lean_string_dec_eq(v_op_5170_, v___x_5300_);
if (v___x_5301_ == 0)
{
lean_object* v___x_5302_; uint8_t v___x_5303_; 
lean_dec(v_h__35_5205_);
v___x_5302_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__27));
v___x_5303_ = lean_string_dec_eq(v_op_5170_, v___x_5302_);
if (v___x_5303_ == 0)
{
lean_object* v___x_5304_; uint8_t v___x_5305_; 
lean_dec(v_h__36_5206_);
v___x_5304_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__28));
v___x_5305_ = lean_string_dec_eq(v_op_5170_, v___x_5304_);
if (v___x_5305_ == 0)
{
lean_object* v___x_5306_; uint8_t v___x_5307_; 
lean_dec(v_h__37_5207_);
v___x_5306_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__29));
v___x_5307_ = lean_string_dec_eq(v_op_5170_, v___x_5306_);
if (v___x_5307_ == 0)
{
lean_object* v___x_5308_; uint8_t v___x_5309_; 
lean_dec(v_h__38_5208_);
v___x_5308_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__30));
v___x_5309_ = lean_string_dec_eq(v_op_5170_, v___x_5308_);
if (v___x_5309_ == 0)
{
lean_object* v___x_5310_; uint8_t v___x_5311_; 
lean_dec(v_h__39_5209_);
v___x_5310_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__31));
v___x_5311_ = lean_string_dec_eq(v_op_5170_, v___x_5310_);
if (v___x_5311_ == 0)
{
lean_object* v___x_5312_; uint8_t v___x_5313_; 
lean_dec(v_h__40_5210_);
v___x_5312_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__32));
v___x_5313_ = lean_string_dec_eq(v_op_5170_, v___x_5312_);
if (v___x_5313_ == 0)
{
lean_object* v___x_5314_; uint8_t v___x_5315_; 
lean_dec(v_h__41_5211_);
v___x_5314_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__33));
v___x_5315_ = lean_string_dec_eq(v_op_5170_, v___x_5314_);
if (v___x_5315_ == 0)
{
lean_object* v___x_5316_; uint8_t v___x_5317_; 
lean_dec(v_h__42_5212_);
v___x_5316_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__34));
v___x_5317_ = lean_string_dec_eq(v_op_5170_, v___x_5316_);
if (v___x_5317_ == 0)
{
lean_object* v___x_5318_; uint8_t v___x_5319_; 
lean_dec(v_h__43_5213_);
v___x_5318_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__35));
v___x_5319_ = lean_string_dec_eq(v_op_5170_, v___x_5318_);
if (v___x_5319_ == 0)
{
lean_object* v___x_5320_; uint8_t v___x_5321_; 
lean_dec(v_h__44_5214_);
v___x_5320_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__36));
v___x_5321_ = lean_string_dec_eq(v_op_5170_, v___x_5320_);
if (v___x_5321_ == 0)
{
lean_object* v___x_5322_; uint8_t v___x_5323_; 
lean_dec(v_h__45_5215_);
v___x_5322_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__37));
v___x_5323_ = lean_string_dec_eq(v_op_5170_, v___x_5322_);
if (v___x_5323_ == 0)
{
lean_object* v___x_5324_; uint8_t v___x_5325_; 
lean_dec(v_h__46_5216_);
v___x_5324_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__38));
v___x_5325_ = lean_string_dec_eq(v_op_5170_, v___x_5324_);
if (v___x_5325_ == 0)
{
lean_object* v___x_5326_; uint8_t v___x_5327_; 
lean_dec(v_h__47_5217_);
v___x_5326_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__39));
v___x_5327_ = lean_string_dec_eq(v_op_5170_, v___x_5326_);
if (v___x_5327_ == 0)
{
lean_object* v___x_5328_; uint8_t v___x_5329_; 
lean_dec(v_h__48_5218_);
v___x_5328_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__40));
v___x_5329_ = lean_string_dec_eq(v_op_5170_, v___x_5328_);
if (v___x_5329_ == 0)
{
lean_object* v___x_5330_; uint8_t v___x_5331_; 
lean_dec(v_h__49_5219_);
v___x_5330_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__41));
v___x_5331_ = lean_string_dec_eq(v_op_5170_, v___x_5330_);
if (v___x_5331_ == 0)
{
lean_object* v___x_5332_; uint8_t v___x_5333_; 
lean_dec(v_h__50_5220_);
v___x_5332_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__42));
v___x_5333_ = lean_string_dec_eq(v_op_5170_, v___x_5332_);
if (v___x_5333_ == 0)
{
lean_object* v___x_5334_; uint8_t v___x_5335_; 
lean_dec(v_h__51_5221_);
v___x_5334_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__6));
v___x_5335_ = lean_string_dec_eq(v_op_5170_, v___x_5334_);
if (v___x_5335_ == 0)
{
lean_object* v___x_5336_; uint8_t v___x_5337_; 
lean_dec(v_h__52_5222_);
v___x_5336_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__7));
v___x_5337_ = lean_string_dec_eq(v_op_5170_, v___x_5336_);
if (v___x_5337_ == 0)
{
lean_object* v___x_5338_; uint8_t v___x_5339_; 
lean_dec(v_h__53_5223_);
v___x_5338_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__8));
v___x_5339_ = lean_string_dec_eq(v_op_5170_, v___x_5338_);
if (v___x_5339_ == 0)
{
lean_object* v___x_5340_; uint8_t v___x_5341_; 
lean_dec(v_h__54_5224_);
v___x_5340_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__9));
v___x_5341_ = lean_string_dec_eq(v_op_5170_, v___x_5340_);
if (v___x_5341_ == 0)
{
lean_object* v___x_5342_; uint8_t v___x_5343_; 
lean_dec(v_h__55_5225_);
v___x_5342_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__10));
v___x_5343_ = lean_string_dec_eq(v_op_5170_, v___x_5342_);
if (v___x_5343_ == 0)
{
lean_object* v___x_5344_; uint8_t v___x_5345_; 
lean_dec(v_h__56_5226_);
v___x_5344_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__11));
v___x_5345_ = lean_string_dec_eq(v_op_5170_, v___x_5344_);
if (v___x_5345_ == 0)
{
lean_object* v___x_5346_; uint8_t v___x_5347_; 
lean_dec(v_h__57_5227_);
v___x_5346_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__43));
v___x_5347_ = lean_string_dec_eq(v_op_5170_, v___x_5346_);
if (v___x_5347_ == 0)
{
lean_object* v___x_5348_; uint8_t v___x_5349_; 
lean_dec(v_h__58_5228_);
v___x_5348_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__44));
v___x_5349_ = lean_string_dec_eq(v_op_5170_, v___x_5348_);
if (v___x_5349_ == 0)
{
lean_object* v___x_5350_; uint8_t v___x_5351_; 
lean_dec(v_h__59_5229_);
v___x_5350_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__45));
v___x_5351_ = lean_string_dec_eq(v_op_5170_, v___x_5350_);
if (v___x_5351_ == 0)
{
lean_object* v___x_5352_; 
lean_dec(v_h__60_5230_);
{
lean_object* _aargs[] = {v_op_5170_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0)};
v___x_5352_ = lean_apply_m(v_h__61_5231_, 61, _aargs);
}
return v___x_5352_;
}
else
{
lean_object* v___x_5353_; lean_object* v___x_5354_; 
lean_dec(v_h__61_5231_);
lean_dec_ref(v_op_5170_);
v___x_5353_ = lean_box(0);
v___x_5354_ = lean_apply_1(v_h__60_5230_, v___x_5353_);
return v___x_5354_;
}
}
else
{
lean_object* v___x_5355_; lean_object* v___x_5356_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec_ref(v_op_5170_);
v___x_5355_ = lean_box(0);
v___x_5356_ = lean_apply_1(v_h__59_5229_, v___x_5355_);
return v___x_5356_;
}
}
else
{
lean_object* v___x_5357_; lean_object* v___x_5358_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec_ref(v_op_5170_);
v___x_5357_ = lean_box(0);
v___x_5358_ = lean_apply_1(v_h__58_5228_, v___x_5357_);
return v___x_5358_;
}
}
else
{
lean_object* v___x_5359_; lean_object* v___x_5360_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec_ref(v_op_5170_);
v___x_5359_ = lean_box(0);
v___x_5360_ = lean_apply_1(v_h__57_5227_, v___x_5359_);
return v___x_5360_;
}
}
else
{
lean_object* v___x_5361_; lean_object* v___x_5362_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec_ref(v_op_5170_);
v___x_5361_ = lean_box(0);
v___x_5362_ = lean_apply_1(v_h__56_5226_, v___x_5361_);
return v___x_5362_;
}
}
else
{
lean_object* v___x_5363_; lean_object* v___x_5364_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec_ref(v_op_5170_);
v___x_5363_ = lean_box(0);
v___x_5364_ = lean_apply_1(v_h__55_5225_, v___x_5363_);
return v___x_5364_;
}
}
else
{
lean_object* v___x_5365_; lean_object* v___x_5366_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec_ref(v_op_5170_);
v___x_5365_ = lean_box(0);
v___x_5366_ = lean_apply_1(v_h__54_5224_, v___x_5365_);
return v___x_5366_;
}
}
else
{
lean_object* v___x_5367_; lean_object* v___x_5368_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec_ref(v_op_5170_);
v___x_5367_ = lean_box(0);
v___x_5368_ = lean_apply_1(v_h__53_5223_, v___x_5367_);
return v___x_5368_;
}
}
else
{
lean_object* v___x_5369_; lean_object* v___x_5370_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec_ref(v_op_5170_);
v___x_5369_ = lean_box(0);
v___x_5370_ = lean_apply_1(v_h__52_5222_, v___x_5369_);
return v___x_5370_;
}
}
else
{
lean_object* v___x_5371_; lean_object* v___x_5372_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec_ref(v_op_5170_);
v___x_5371_ = lean_box(0);
v___x_5372_ = lean_apply_1(v_h__51_5221_, v___x_5371_);
return v___x_5372_;
}
}
else
{
lean_object* v___x_5373_; lean_object* v___x_5374_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec_ref(v_op_5170_);
v___x_5373_ = lean_box(0);
v___x_5374_ = lean_apply_1(v_h__50_5220_, v___x_5373_);
return v___x_5374_;
}
}
else
{
lean_object* v___x_5375_; lean_object* v___x_5376_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec_ref(v_op_5170_);
v___x_5375_ = lean_box(0);
v___x_5376_ = lean_apply_1(v_h__49_5219_, v___x_5375_);
return v___x_5376_;
}
}
else
{
lean_object* v___x_5377_; lean_object* v___x_5378_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec_ref(v_op_5170_);
v___x_5377_ = lean_box(0);
v___x_5378_ = lean_apply_1(v_h__48_5218_, v___x_5377_);
return v___x_5378_;
}
}
else
{
lean_object* v___x_5379_; lean_object* v___x_5380_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec_ref(v_op_5170_);
v___x_5379_ = lean_box(0);
v___x_5380_ = lean_apply_1(v_h__47_5217_, v___x_5379_);
return v___x_5380_;
}
}
else
{
lean_object* v___x_5381_; lean_object* v___x_5382_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec_ref(v_op_5170_);
v___x_5381_ = lean_box(0);
v___x_5382_ = lean_apply_1(v_h__46_5216_, v___x_5381_);
return v___x_5382_;
}
}
else
{
lean_object* v___x_5383_; lean_object* v___x_5384_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec_ref(v_op_5170_);
v___x_5383_ = lean_box(0);
v___x_5384_ = lean_apply_1(v_h__45_5215_, v___x_5383_);
return v___x_5384_;
}
}
else
{
lean_object* v___x_5385_; lean_object* v___x_5386_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec_ref(v_op_5170_);
v___x_5385_ = lean_box(0);
v___x_5386_ = lean_apply_1(v_h__44_5214_, v___x_5385_);
return v___x_5386_;
}
}
else
{
lean_object* v___x_5387_; lean_object* v___x_5388_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec_ref(v_op_5170_);
v___x_5387_ = lean_box(0);
v___x_5388_ = lean_apply_1(v_h__43_5213_, v___x_5387_);
return v___x_5388_;
}
}
else
{
lean_object* v___x_5389_; lean_object* v___x_5390_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec_ref(v_op_5170_);
v___x_5389_ = lean_box(0);
v___x_5390_ = lean_apply_1(v_h__42_5212_, v___x_5389_);
return v___x_5390_;
}
}
else
{
lean_object* v___x_5391_; lean_object* v___x_5392_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec_ref(v_op_5170_);
v___x_5391_ = lean_box(0);
v___x_5392_ = lean_apply_1(v_h__41_5211_, v___x_5391_);
return v___x_5392_;
}
}
else
{
lean_object* v___x_5393_; lean_object* v___x_5394_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec_ref(v_op_5170_);
v___x_5393_ = lean_box(0);
v___x_5394_ = lean_apply_1(v_h__40_5210_, v___x_5393_);
return v___x_5394_;
}
}
else
{
lean_object* v___x_5395_; lean_object* v___x_5396_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec_ref(v_op_5170_);
v___x_5395_ = lean_box(0);
v___x_5396_ = lean_apply_1(v_h__39_5209_, v___x_5395_);
return v___x_5396_;
}
}
else
{
lean_object* v___x_5397_; lean_object* v___x_5398_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec_ref(v_op_5170_);
v___x_5397_ = lean_box(0);
v___x_5398_ = lean_apply_1(v_h__38_5208_, v___x_5397_);
return v___x_5398_;
}
}
else
{
lean_object* v___x_5399_; lean_object* v___x_5400_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec_ref(v_op_5170_);
v___x_5399_ = lean_box(0);
v___x_5400_ = lean_apply_1(v_h__37_5207_, v___x_5399_);
return v___x_5400_;
}
}
else
{
lean_object* v___x_5401_; lean_object* v___x_5402_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec_ref(v_op_5170_);
v___x_5401_ = lean_box(0);
v___x_5402_ = lean_apply_1(v_h__36_5206_, v___x_5401_);
return v___x_5402_;
}
}
else
{
lean_object* v___x_5403_; lean_object* v___x_5404_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec_ref(v_op_5170_);
v___x_5403_ = lean_box(0);
v___x_5404_ = lean_apply_1(v_h__35_5205_, v___x_5403_);
return v___x_5404_;
}
}
else
{
lean_object* v___x_5405_; lean_object* v___x_5406_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec_ref(v_op_5170_);
v___x_5405_ = lean_box(0);
v___x_5406_ = lean_apply_1(v_h__34_5204_, v___x_5405_);
return v___x_5406_;
}
}
else
{
lean_object* v___x_5407_; lean_object* v___x_5408_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec_ref(v_op_5170_);
v___x_5407_ = lean_box(0);
v___x_5408_ = lean_apply_1(v_h__33_5203_, v___x_5407_);
return v___x_5408_;
}
}
else
{
lean_object* v___x_5409_; lean_object* v___x_5410_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec_ref(v_op_5170_);
v___x_5409_ = lean_box(0);
v___x_5410_ = lean_apply_1(v_h__32_5202_, v___x_5409_);
return v___x_5410_;
}
}
else
{
lean_object* v___x_5411_; lean_object* v___x_5412_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec_ref(v_op_5170_);
v___x_5411_ = lean_box(0);
v___x_5412_ = lean_apply_1(v_h__31_5201_, v___x_5411_);
return v___x_5412_;
}
}
else
{
lean_object* v___x_5413_; lean_object* v___x_5414_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec_ref(v_op_5170_);
v___x_5413_ = lean_box(0);
v___x_5414_ = lean_apply_1(v_h__30_5200_, v___x_5413_);
return v___x_5414_;
}
}
else
{
lean_object* v___x_5415_; lean_object* v___x_5416_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec_ref(v_op_5170_);
v___x_5415_ = lean_box(0);
v___x_5416_ = lean_apply_1(v_h__29_5199_, v___x_5415_);
return v___x_5416_;
}
}
else
{
lean_object* v___x_5417_; lean_object* v___x_5418_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec_ref(v_op_5170_);
v___x_5417_ = lean_box(0);
v___x_5418_ = lean_apply_1(v_h__28_5198_, v___x_5417_);
return v___x_5418_;
}
}
else
{
lean_object* v___x_5419_; lean_object* v___x_5420_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec_ref(v_op_5170_);
v___x_5419_ = lean_box(0);
v___x_5420_ = lean_apply_1(v_h__27_5197_, v___x_5419_);
return v___x_5420_;
}
}
else
{
lean_object* v___x_5421_; lean_object* v___x_5422_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec_ref(v_op_5170_);
v___x_5421_ = lean_box(0);
v___x_5422_ = lean_apply_1(v_h__26_5196_, v___x_5421_);
return v___x_5422_;
}
}
else
{
lean_object* v___x_5423_; lean_object* v___x_5424_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec_ref(v_op_5170_);
v___x_5423_ = lean_box(0);
v___x_5424_ = lean_apply_1(v_h__25_5195_, v___x_5423_);
return v___x_5424_;
}
}
else
{
lean_object* v___x_5425_; lean_object* v___x_5426_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec_ref(v_op_5170_);
v___x_5425_ = lean_box(0);
v___x_5426_ = lean_apply_1(v_h__24_5194_, v___x_5425_);
return v___x_5426_;
}
}
else
{
lean_object* v___x_5427_; lean_object* v___x_5428_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec_ref(v_op_5170_);
v___x_5427_ = lean_box(0);
v___x_5428_ = lean_apply_1(v_h__23_5193_, v___x_5427_);
return v___x_5428_;
}
}
else
{
lean_object* v___x_5429_; lean_object* v___x_5430_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec_ref(v_op_5170_);
v___x_5429_ = lean_box(0);
v___x_5430_ = lean_apply_1(v_h__22_5192_, v___x_5429_);
return v___x_5430_;
}
}
else
{
lean_object* v___x_5431_; lean_object* v___x_5432_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec_ref(v_op_5170_);
v___x_5431_ = lean_box(0);
v___x_5432_ = lean_apply_1(v_h__21_5191_, v___x_5431_);
return v___x_5432_;
}
}
else
{
lean_object* v___x_5433_; lean_object* v___x_5434_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec_ref(v_op_5170_);
v___x_5433_ = lean_box(0);
v___x_5434_ = lean_apply_1(v_h__20_5190_, v___x_5433_);
return v___x_5434_;
}
}
else
{
lean_object* v___x_5435_; lean_object* v___x_5436_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec_ref(v_op_5170_);
v___x_5435_ = lean_box(0);
v___x_5436_ = lean_apply_1(v_h__19_5189_, v___x_5435_);
return v___x_5436_;
}
}
else
{
lean_object* v___x_5437_; lean_object* v___x_5438_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec_ref(v_op_5170_);
v___x_5437_ = lean_box(0);
v___x_5438_ = lean_apply_1(v_h__18_5188_, v___x_5437_);
return v___x_5438_;
}
}
else
{
lean_object* v___x_5439_; lean_object* v___x_5440_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec(v_h__18_5188_);
lean_dec_ref(v_op_5170_);
v___x_5439_ = lean_box(0);
v___x_5440_ = lean_apply_1(v_h__17_5187_, v___x_5439_);
return v___x_5440_;
}
}
else
{
lean_object* v___x_5441_; lean_object* v___x_5442_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec(v_h__18_5188_);
lean_dec(v_h__17_5187_);
lean_dec_ref(v_op_5170_);
v___x_5441_ = lean_box(0);
v___x_5442_ = lean_apply_1(v_h__16_5186_, v___x_5441_);
return v___x_5442_;
}
}
else
{
lean_object* v___x_5443_; lean_object* v___x_5444_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec(v_h__18_5188_);
lean_dec(v_h__17_5187_);
lean_dec(v_h__16_5186_);
lean_dec_ref(v_op_5170_);
v___x_5443_ = lean_box(0);
v___x_5444_ = lean_apply_1(v_h__15_5185_, v___x_5443_);
return v___x_5444_;
}
}
else
{
lean_object* v___x_5445_; lean_object* v___x_5446_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec(v_h__18_5188_);
lean_dec(v_h__17_5187_);
lean_dec(v_h__16_5186_);
lean_dec(v_h__15_5185_);
lean_dec_ref(v_op_5170_);
v___x_5445_ = lean_box(0);
v___x_5446_ = lean_apply_1(v_h__14_5184_, v___x_5445_);
return v___x_5446_;
}
}
else
{
lean_object* v___x_5447_; lean_object* v___x_5448_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec(v_h__18_5188_);
lean_dec(v_h__17_5187_);
lean_dec(v_h__16_5186_);
lean_dec(v_h__15_5185_);
lean_dec(v_h__14_5184_);
lean_dec_ref(v_op_5170_);
v___x_5447_ = lean_box(0);
v___x_5448_ = lean_apply_1(v_h__13_5183_, v___x_5447_);
return v___x_5448_;
}
}
else
{
lean_object* v___x_5449_; lean_object* v___x_5450_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec(v_h__18_5188_);
lean_dec(v_h__17_5187_);
lean_dec(v_h__16_5186_);
lean_dec(v_h__15_5185_);
lean_dec(v_h__14_5184_);
lean_dec(v_h__13_5183_);
lean_dec_ref(v_op_5170_);
v___x_5449_ = lean_box(0);
v___x_5450_ = lean_apply_1(v_h__12_5182_, v___x_5449_);
return v___x_5450_;
}
}
else
{
lean_object* v___x_5451_; lean_object* v___x_5452_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec(v_h__18_5188_);
lean_dec(v_h__17_5187_);
lean_dec(v_h__16_5186_);
lean_dec(v_h__15_5185_);
lean_dec(v_h__14_5184_);
lean_dec(v_h__13_5183_);
lean_dec(v_h__12_5182_);
lean_dec_ref(v_op_5170_);
v___x_5451_ = lean_box(0);
v___x_5452_ = lean_apply_1(v_h__11_5181_, v___x_5451_);
return v___x_5452_;
}
}
else
{
lean_object* v___x_5453_; lean_object* v___x_5454_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec(v_h__18_5188_);
lean_dec(v_h__17_5187_);
lean_dec(v_h__16_5186_);
lean_dec(v_h__15_5185_);
lean_dec(v_h__14_5184_);
lean_dec(v_h__13_5183_);
lean_dec(v_h__12_5182_);
lean_dec(v_h__11_5181_);
lean_dec_ref(v_op_5170_);
v___x_5453_ = lean_box(0);
v___x_5454_ = lean_apply_1(v_h__10_5180_, v___x_5453_);
return v___x_5454_;
}
}
else
{
lean_object* v___x_5455_; lean_object* v___x_5456_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec(v_h__18_5188_);
lean_dec(v_h__17_5187_);
lean_dec(v_h__16_5186_);
lean_dec(v_h__15_5185_);
lean_dec(v_h__14_5184_);
lean_dec(v_h__13_5183_);
lean_dec(v_h__12_5182_);
lean_dec(v_h__11_5181_);
lean_dec(v_h__10_5180_);
lean_dec_ref(v_op_5170_);
v___x_5455_ = lean_box(0);
v___x_5456_ = lean_apply_1(v_h__9_5179_, v___x_5455_);
return v___x_5456_;
}
}
else
{
lean_object* v___x_5457_; lean_object* v___x_5458_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec(v_h__18_5188_);
lean_dec(v_h__17_5187_);
lean_dec(v_h__16_5186_);
lean_dec(v_h__15_5185_);
lean_dec(v_h__14_5184_);
lean_dec(v_h__13_5183_);
lean_dec(v_h__12_5182_);
lean_dec(v_h__11_5181_);
lean_dec(v_h__10_5180_);
lean_dec(v_h__9_5179_);
lean_dec_ref(v_op_5170_);
v___x_5457_ = lean_box(0);
v___x_5458_ = lean_apply_1(v_h__8_5178_, v___x_5457_);
return v___x_5458_;
}
}
else
{
lean_object* v___x_5459_; lean_object* v___x_5460_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec(v_h__18_5188_);
lean_dec(v_h__17_5187_);
lean_dec(v_h__16_5186_);
lean_dec(v_h__15_5185_);
lean_dec(v_h__14_5184_);
lean_dec(v_h__13_5183_);
lean_dec(v_h__12_5182_);
lean_dec(v_h__11_5181_);
lean_dec(v_h__10_5180_);
lean_dec(v_h__9_5179_);
lean_dec(v_h__8_5178_);
lean_dec_ref(v_op_5170_);
v___x_5459_ = lean_box(0);
v___x_5460_ = lean_apply_1(v_h__7_5177_, v___x_5459_);
return v___x_5460_;
}
}
else
{
lean_object* v___x_5461_; lean_object* v___x_5462_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec(v_h__18_5188_);
lean_dec(v_h__17_5187_);
lean_dec(v_h__16_5186_);
lean_dec(v_h__15_5185_);
lean_dec(v_h__14_5184_);
lean_dec(v_h__13_5183_);
lean_dec(v_h__12_5182_);
lean_dec(v_h__11_5181_);
lean_dec(v_h__10_5180_);
lean_dec(v_h__9_5179_);
lean_dec(v_h__8_5178_);
lean_dec(v_h__7_5177_);
lean_dec_ref(v_op_5170_);
v___x_5461_ = lean_box(0);
v___x_5462_ = lean_apply_1(v_h__6_5176_, v___x_5461_);
return v___x_5462_;
}
}
else
{
lean_object* v___x_5463_; lean_object* v___x_5464_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec(v_h__18_5188_);
lean_dec(v_h__17_5187_);
lean_dec(v_h__16_5186_);
lean_dec(v_h__15_5185_);
lean_dec(v_h__14_5184_);
lean_dec(v_h__13_5183_);
lean_dec(v_h__12_5182_);
lean_dec(v_h__11_5181_);
lean_dec(v_h__10_5180_);
lean_dec(v_h__9_5179_);
lean_dec(v_h__8_5178_);
lean_dec(v_h__7_5177_);
lean_dec(v_h__6_5176_);
lean_dec_ref(v_op_5170_);
v___x_5463_ = lean_box(0);
v___x_5464_ = lean_apply_1(v_h__5_5175_, v___x_5463_);
return v___x_5464_;
}
}
else
{
lean_object* v___x_5465_; lean_object* v___x_5466_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec(v_h__18_5188_);
lean_dec(v_h__17_5187_);
lean_dec(v_h__16_5186_);
lean_dec(v_h__15_5185_);
lean_dec(v_h__14_5184_);
lean_dec(v_h__13_5183_);
lean_dec(v_h__12_5182_);
lean_dec(v_h__11_5181_);
lean_dec(v_h__10_5180_);
lean_dec(v_h__9_5179_);
lean_dec(v_h__8_5178_);
lean_dec(v_h__7_5177_);
lean_dec(v_h__6_5176_);
lean_dec(v_h__5_5175_);
lean_dec_ref(v_op_5170_);
v___x_5465_ = lean_box(0);
v___x_5466_ = lean_apply_1(v_h__4_5174_, v___x_5465_);
return v___x_5466_;
}
}
else
{
lean_object* v___x_5467_; lean_object* v___x_5468_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec(v_h__18_5188_);
lean_dec(v_h__17_5187_);
lean_dec(v_h__16_5186_);
lean_dec(v_h__15_5185_);
lean_dec(v_h__14_5184_);
lean_dec(v_h__13_5183_);
lean_dec(v_h__12_5182_);
lean_dec(v_h__11_5181_);
lean_dec(v_h__10_5180_);
lean_dec(v_h__9_5179_);
lean_dec(v_h__8_5178_);
lean_dec(v_h__7_5177_);
lean_dec(v_h__6_5176_);
lean_dec(v_h__5_5175_);
lean_dec(v_h__4_5174_);
lean_dec_ref(v_op_5170_);
v___x_5467_ = lean_box(0);
v___x_5468_ = lean_apply_1(v_h__3_5173_, v___x_5467_);
return v___x_5468_;
}
}
else
{
lean_object* v___x_5469_; lean_object* v___x_5470_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec(v_h__18_5188_);
lean_dec(v_h__17_5187_);
lean_dec(v_h__16_5186_);
lean_dec(v_h__15_5185_);
lean_dec(v_h__14_5184_);
lean_dec(v_h__13_5183_);
lean_dec(v_h__12_5182_);
lean_dec(v_h__11_5181_);
lean_dec(v_h__10_5180_);
lean_dec(v_h__9_5179_);
lean_dec(v_h__8_5178_);
lean_dec(v_h__7_5177_);
lean_dec(v_h__6_5176_);
lean_dec(v_h__5_5175_);
lean_dec(v_h__4_5174_);
lean_dec(v_h__3_5173_);
lean_dec_ref(v_op_5170_);
v___x_5469_ = lean_box(0);
v___x_5470_ = lean_apply_1(v_h__2_5172_, v___x_5469_);
return v___x_5470_;
}
}
else
{
lean_object* v___x_5471_; lean_object* v___x_5472_; 
lean_dec(v_h__61_5231_);
lean_dec(v_h__60_5230_);
lean_dec(v_h__59_5229_);
lean_dec(v_h__58_5228_);
lean_dec(v_h__57_5227_);
lean_dec(v_h__56_5226_);
lean_dec(v_h__55_5225_);
lean_dec(v_h__54_5224_);
lean_dec(v_h__53_5223_);
lean_dec(v_h__52_5222_);
lean_dec(v_h__51_5221_);
lean_dec(v_h__50_5220_);
lean_dec(v_h__49_5219_);
lean_dec(v_h__48_5218_);
lean_dec(v_h__47_5217_);
lean_dec(v_h__46_5216_);
lean_dec(v_h__45_5215_);
lean_dec(v_h__44_5214_);
lean_dec(v_h__43_5213_);
lean_dec(v_h__42_5212_);
lean_dec(v_h__41_5211_);
lean_dec(v_h__40_5210_);
lean_dec(v_h__39_5209_);
lean_dec(v_h__38_5208_);
lean_dec(v_h__37_5207_);
lean_dec(v_h__36_5206_);
lean_dec(v_h__35_5205_);
lean_dec(v_h__34_5204_);
lean_dec(v_h__33_5203_);
lean_dec(v_h__32_5202_);
lean_dec(v_h__31_5201_);
lean_dec(v_h__30_5200_);
lean_dec(v_h__29_5199_);
lean_dec(v_h__28_5198_);
lean_dec(v_h__27_5197_);
lean_dec(v_h__26_5196_);
lean_dec(v_h__25_5195_);
lean_dec(v_h__24_5194_);
lean_dec(v_h__23_5193_);
lean_dec(v_h__22_5192_);
lean_dec(v_h__21_5191_);
lean_dec(v_h__20_5190_);
lean_dec(v_h__19_5189_);
lean_dec(v_h__18_5188_);
lean_dec(v_h__17_5187_);
lean_dec(v_h__16_5186_);
lean_dec(v_h__15_5185_);
lean_dec(v_h__14_5184_);
lean_dec(v_h__13_5183_);
lean_dec(v_h__12_5182_);
lean_dec(v_h__11_5181_);
lean_dec(v_h__10_5180_);
lean_dec(v_h__9_5179_);
lean_dec(v_h__8_5178_);
lean_dec(v_h__7_5177_);
lean_dec(v_h__6_5176_);
lean_dec(v_h__5_5175_);
lean_dec(v_h__4_5174_);
lean_dec(v_h__3_5173_);
lean_dec(v_h__2_5172_);
lean_dec_ref(v_op_5170_);
v___x_5471_ = lean_box(0);
v___x_5472_ = lean_apply_1(v_h__1_5171_, v___x_5471_);
return v___x_5472_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___boxed(lean_object** _args){
lean_object* v_op_5473_ = _args[0];
lean_object* v_h__1_5474_ = _args[1];
lean_object* v_h__2_5475_ = _args[2];
lean_object* v_h__3_5476_ = _args[3];
lean_object* v_h__4_5477_ = _args[4];
lean_object* v_h__5_5478_ = _args[5];
lean_object* v_h__6_5479_ = _args[6];
lean_object* v_h__7_5480_ = _args[7];
lean_object* v_h__8_5481_ = _args[8];
lean_object* v_h__9_5482_ = _args[9];
lean_object* v_h__10_5483_ = _args[10];
lean_object* v_h__11_5484_ = _args[11];
lean_object* v_h__12_5485_ = _args[12];
lean_object* v_h__13_5486_ = _args[13];
lean_object* v_h__14_5487_ = _args[14];
lean_object* v_h__15_5488_ = _args[15];
lean_object* v_h__16_5489_ = _args[16];
lean_object* v_h__17_5490_ = _args[17];
lean_object* v_h__18_5491_ = _args[18];
lean_object* v_h__19_5492_ = _args[19];
lean_object* v_h__20_5493_ = _args[20];
lean_object* v_h__21_5494_ = _args[21];
lean_object* v_h__22_5495_ = _args[22];
lean_object* v_h__23_5496_ = _args[23];
lean_object* v_h__24_5497_ = _args[24];
lean_object* v_h__25_5498_ = _args[25];
lean_object* v_h__26_5499_ = _args[26];
lean_object* v_h__27_5500_ = _args[27];
lean_object* v_h__28_5501_ = _args[28];
lean_object* v_h__29_5502_ = _args[29];
lean_object* v_h__30_5503_ = _args[30];
lean_object* v_h__31_5504_ = _args[31];
lean_object* v_h__32_5505_ = _args[32];
lean_object* v_h__33_5506_ = _args[33];
lean_object* v_h__34_5507_ = _args[34];
lean_object* v_h__35_5508_ = _args[35];
lean_object* v_h__36_5509_ = _args[36];
lean_object* v_h__37_5510_ = _args[37];
lean_object* v_h__38_5511_ = _args[38];
lean_object* v_h__39_5512_ = _args[39];
lean_object* v_h__40_5513_ = _args[40];
lean_object* v_h__41_5514_ = _args[41];
lean_object* v_h__42_5515_ = _args[42];
lean_object* v_h__43_5516_ = _args[43];
lean_object* v_h__44_5517_ = _args[44];
lean_object* v_h__45_5518_ = _args[45];
lean_object* v_h__46_5519_ = _args[46];
lean_object* v_h__47_5520_ = _args[47];
lean_object* v_h__48_5521_ = _args[48];
lean_object* v_h__49_5522_ = _args[49];
lean_object* v_h__50_5523_ = _args[50];
lean_object* v_h__51_5524_ = _args[51];
lean_object* v_h__52_5525_ = _args[52];
lean_object* v_h__53_5526_ = _args[53];
lean_object* v_h__54_5527_ = _args[54];
lean_object* v_h__55_5528_ = _args[55];
lean_object* v_h__56_5529_ = _args[56];
lean_object* v_h__57_5530_ = _args[57];
lean_object* v_h__58_5531_ = _args[58];
lean_object* v_h__59_5532_ = _args[59];
lean_object* v_h__60_5533_ = _args[60];
lean_object* v_h__61_5534_ = _args[61];
_start:
{
lean_object* v_res_5535_; 
v_res_5535_ = lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg(v_op_5473_, v_h__1_5474_, v_h__2_5475_, v_h__3_5476_, v_h__4_5477_, v_h__5_5478_, v_h__6_5479_, v_h__7_5480_, v_h__8_5481_, v_h__9_5482_, v_h__10_5483_, v_h__11_5484_, v_h__12_5485_, v_h__13_5486_, v_h__14_5487_, v_h__15_5488_, v_h__16_5489_, v_h__17_5490_, v_h__18_5491_, v_h__19_5492_, v_h__20_5493_, v_h__21_5494_, v_h__22_5495_, v_h__23_5496_, v_h__24_5497_, v_h__25_5498_, v_h__26_5499_, v_h__27_5500_, v_h__28_5501_, v_h__29_5502_, v_h__30_5503_, v_h__31_5504_, v_h__32_5505_, v_h__33_5506_, v_h__34_5507_, v_h__35_5508_, v_h__36_5509_, v_h__37_5510_, v_h__38_5511_, v_h__39_5512_, v_h__40_5513_, v_h__41_5514_, v_h__42_5515_, v_h__43_5516_, v_h__44_5517_, v_h__45_5518_, v_h__46_5519_, v_h__47_5520_, v_h__48_5521_, v_h__49_5522_, v_h__50_5523_, v_h__51_5524_, v_h__52_5525_, v_h__53_5526_, v_h__54_5527_, v_h__55_5528_, v_h__56_5529_, v_h__57_5530_, v_h__58_5531_, v_h__59_5532_, v_h__60_5533_, v_h__61_5534_);
return v_res_5535_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter(lean_object* v_motive_5536_, lean_object* v_op_5537_, lean_object* v_h__1_5538_, lean_object* v_h__2_5539_, lean_object* v_h__3_5540_, lean_object* v_h__4_5541_, lean_object* v_h__5_5542_, lean_object* v_h__6_5543_, lean_object* v_h__7_5544_, lean_object* v_h__8_5545_, lean_object* v_h__9_5546_, lean_object* v_h__10_5547_, lean_object* v_h__11_5548_, lean_object* v_h__12_5549_, lean_object* v_h__13_5550_, lean_object* v_h__14_5551_, lean_object* v_h__15_5552_, lean_object* v_h__16_5553_, lean_object* v_h__17_5554_, lean_object* v_h__18_5555_, lean_object* v_h__19_5556_, lean_object* v_h__20_5557_, lean_object* v_h__21_5558_, lean_object* v_h__22_5559_, lean_object* v_h__23_5560_, lean_object* v_h__24_5561_, lean_object* v_h__25_5562_, lean_object* v_h__26_5563_, lean_object* v_h__27_5564_, lean_object* v_h__28_5565_, lean_object* v_h__29_5566_, lean_object* v_h__30_5567_, lean_object* v_h__31_5568_, lean_object* v_h__32_5569_, lean_object* v_h__33_5570_, lean_object* v_h__34_5571_, lean_object* v_h__35_5572_, lean_object* v_h__36_5573_, lean_object* v_h__37_5574_, lean_object* v_h__38_5575_, lean_object* v_h__39_5576_, lean_object* v_h__40_5577_, lean_object* v_h__41_5578_, lean_object* v_h__42_5579_, lean_object* v_h__43_5580_, lean_object* v_h__44_5581_, lean_object* v_h__45_5582_, lean_object* v_h__46_5583_, lean_object* v_h__47_5584_, lean_object* v_h__48_5585_, lean_object* v_h__49_5586_, lean_object* v_h__50_5587_, lean_object* v_h__51_5588_, lean_object* v_h__52_5589_, lean_object* v_h__53_5590_, lean_object* v_h__54_5591_, lean_object* v_h__55_5592_, lean_object* v_h__56_5593_, lean_object* v_h__57_5594_, lean_object* v_h__58_5595_, lean_object* v_h__59_5596_, lean_object* v_h__60_5597_, lean_object* v_h__61_5598_){
_start:
{
lean_object* v___x_5599_; uint8_t v___x_5600_; 
v___x_5599_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__0));
v___x_5600_ = lean_string_dec_eq(v_op_5537_, v___x_5599_);
if (v___x_5600_ == 0)
{
lean_object* v___x_5601_; uint8_t v___x_5602_; 
lean_dec(v_h__1_5538_);
v___x_5601_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__1));
v___x_5602_ = lean_string_dec_eq(v_op_5537_, v___x_5601_);
if (v___x_5602_ == 0)
{
lean_object* v___x_5603_; uint8_t v___x_5604_; 
lean_dec(v_h__2_5539_);
v___x_5603_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__2));
v___x_5604_ = lean_string_dec_eq(v_op_5537_, v___x_5603_);
if (v___x_5604_ == 0)
{
lean_object* v___x_5605_; uint8_t v___x_5606_; 
lean_dec(v_h__3_5540_);
v___x_5605_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__3));
v___x_5606_ = lean_string_dec_eq(v_op_5537_, v___x_5605_);
if (v___x_5606_ == 0)
{
lean_object* v___x_5607_; uint8_t v___x_5608_; 
lean_dec(v_h__4_5541_);
v___x_5607_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__4));
v___x_5608_ = lean_string_dec_eq(v_op_5537_, v___x_5607_);
if (v___x_5608_ == 0)
{
lean_object* v___x_5609_; uint8_t v___x_5610_; 
lean_dec(v_h__5_5542_);
v___x_5609_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__5));
v___x_5610_ = lean_string_dec_eq(v_op_5537_, v___x_5609_);
if (v___x_5610_ == 0)
{
lean_object* v___x_5611_; uint8_t v___x_5612_; 
lean_dec(v_h__6_5543_);
v___x_5611_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__6));
v___x_5612_ = lean_string_dec_eq(v_op_5537_, v___x_5611_);
if (v___x_5612_ == 0)
{
lean_object* v___x_5613_; uint8_t v___x_5614_; 
lean_dec(v_h__7_5544_);
v___x_5613_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__7));
v___x_5614_ = lean_string_dec_eq(v_op_5537_, v___x_5613_);
if (v___x_5614_ == 0)
{
lean_object* v___x_5615_; uint8_t v___x_5616_; 
lean_dec(v_h__8_5545_);
v___x_5615_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__8));
v___x_5616_ = lean_string_dec_eq(v_op_5537_, v___x_5615_);
if (v___x_5616_ == 0)
{
lean_object* v___x_5617_; uint8_t v___x_5618_; 
lean_dec(v_h__9_5546_);
v___x_5617_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__9));
v___x_5618_ = lean_string_dec_eq(v_op_5537_, v___x_5617_);
if (v___x_5618_ == 0)
{
lean_object* v___x_5619_; uint8_t v___x_5620_; 
lean_dec(v_h__10_5547_);
v___x_5619_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__10));
v___x_5620_ = lean_string_dec_eq(v_op_5537_, v___x_5619_);
if (v___x_5620_ == 0)
{
lean_object* v___x_5621_; uint8_t v___x_5622_; 
lean_dec(v_h__11_5548_);
v___x_5621_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__11));
v___x_5622_ = lean_string_dec_eq(v_op_5537_, v___x_5621_);
if (v___x_5622_ == 0)
{
lean_object* v___x_5623_; uint8_t v___x_5624_; 
lean_dec(v_h__12_5549_);
v___x_5623_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__12));
v___x_5624_ = lean_string_dec_eq(v_op_5537_, v___x_5623_);
if (v___x_5624_ == 0)
{
lean_object* v___x_5625_; uint8_t v___x_5626_; 
lean_dec(v_h__13_5550_);
v___x_5625_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__13));
v___x_5626_ = lean_string_dec_eq(v_op_5537_, v___x_5625_);
if (v___x_5626_ == 0)
{
lean_object* v___x_5627_; uint8_t v___x_5628_; 
lean_dec(v_h__14_5551_);
v___x_5627_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__14));
v___x_5628_ = lean_string_dec_eq(v_op_5537_, v___x_5627_);
if (v___x_5628_ == 0)
{
lean_object* v___x_5629_; uint8_t v___x_5630_; 
lean_dec(v_h__15_5552_);
v___x_5629_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__15));
v___x_5630_ = lean_string_dec_eq(v_op_5537_, v___x_5629_);
if (v___x_5630_ == 0)
{
lean_object* v___x_5631_; uint8_t v___x_5632_; 
lean_dec(v_h__16_5553_);
v___x_5631_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__16));
v___x_5632_ = lean_string_dec_eq(v_op_5537_, v___x_5631_);
if (v___x_5632_ == 0)
{
lean_object* v___x_5633_; uint8_t v___x_5634_; 
lean_dec(v_h__17_5554_);
v___x_5633_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__17));
v___x_5634_ = lean_string_dec_eq(v_op_5537_, v___x_5633_);
if (v___x_5634_ == 0)
{
lean_object* v___x_5635_; uint8_t v___x_5636_; 
lean_dec(v_h__18_5555_);
v___x_5635_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__0));
v___x_5636_ = lean_string_dec_eq(v_op_5537_, v___x_5635_);
if (v___x_5636_ == 0)
{
lean_object* v___x_5637_; uint8_t v___x_5638_; 
lean_dec(v_h__19_5556_);
v___x_5637_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__1));
v___x_5638_ = lean_string_dec_eq(v_op_5537_, v___x_5637_);
if (v___x_5638_ == 0)
{
lean_object* v___x_5639_; uint8_t v___x_5640_; 
lean_dec(v_h__20_5557_);
v___x_5639_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__2));
v___x_5640_ = lean_string_dec_eq(v_op_5537_, v___x_5639_);
if (v___x_5640_ == 0)
{
lean_object* v___x_5641_; uint8_t v___x_5642_; 
lean_dec(v_h__21_5558_);
v___x_5641_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__3));
v___x_5642_ = lean_string_dec_eq(v_op_5537_, v___x_5641_);
if (v___x_5642_ == 0)
{
lean_object* v___x_5643_; uint8_t v___x_5644_; 
lean_dec(v_h__22_5559_);
v___x_5643_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__4));
v___x_5644_ = lean_string_dec_eq(v_op_5537_, v___x_5643_);
if (v___x_5644_ == 0)
{
lean_object* v___x_5645_; uint8_t v___x_5646_; 
lean_dec(v_h__23_5560_);
v___x_5645_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__12));
v___x_5646_ = lean_string_dec_eq(v_op_5537_, v___x_5645_);
if (v___x_5646_ == 0)
{
lean_object* v___x_5647_; uint8_t v___x_5648_; 
lean_dec(v_h__24_5561_);
v___x_5647_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asList___closed__0));
v___x_5648_ = lean_string_dec_eq(v_op_5537_, v___x_5647_);
if (v___x_5648_ == 0)
{
lean_object* v___x_5649_; uint8_t v___x_5650_; 
lean_dec(v_h__25_5562_);
v___x_5649_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__18));
v___x_5650_ = lean_string_dec_eq(v_op_5537_, v___x_5649_);
if (v___x_5650_ == 0)
{
lean_object* v___x_5651_; uint8_t v___x_5652_; 
lean_dec(v_h__26_5563_);
v___x_5651_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__19));
v___x_5652_ = lean_string_dec_eq(v_op_5537_, v___x_5651_);
if (v___x_5652_ == 0)
{
lean_object* v___x_5653_; uint8_t v___x_5654_; 
lean_dec(v_h__27_5564_);
v___x_5653_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__20));
v___x_5654_ = lean_string_dec_eq(v_op_5537_, v___x_5653_);
if (v___x_5654_ == 0)
{
lean_object* v___x_5655_; uint8_t v___x_5656_; 
lean_dec(v_h__28_5565_);
v___x_5655_ = ((lean_object*)(lp_algalVerification_Algal_Expr_asMap___closed__0));
v___x_5656_ = lean_string_dec_eq(v_op_5537_, v___x_5655_);
if (v___x_5656_ == 0)
{
lean_object* v___x_5657_; uint8_t v___x_5658_; 
lean_dec(v_h__29_5566_);
v___x_5657_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__21));
v___x_5658_ = lean_string_dec_eq(v_op_5537_, v___x_5657_);
if (v___x_5658_ == 0)
{
lean_object* v___x_5659_; uint8_t v___x_5660_; 
lean_dec(v_h__30_5567_);
v___x_5659_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__22));
v___x_5660_ = lean_string_dec_eq(v_op_5537_, v___x_5659_);
if (v___x_5660_ == 0)
{
lean_object* v___x_5661_; uint8_t v___x_5662_; 
lean_dec(v_h__31_5568_);
v___x_5661_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__23));
v___x_5662_ = lean_string_dec_eq(v_op_5537_, v___x_5661_);
if (v___x_5662_ == 0)
{
lean_object* v___x_5663_; uint8_t v___x_5664_; 
lean_dec(v_h__32_5569_);
v___x_5663_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__24));
v___x_5664_ = lean_string_dec_eq(v_op_5537_, v___x_5663_);
if (v___x_5664_ == 0)
{
lean_object* v___x_5665_; uint8_t v___x_5666_; 
lean_dec(v_h__33_5570_);
v___x_5665_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__25));
v___x_5666_ = lean_string_dec_eq(v_op_5537_, v___x_5665_);
if (v___x_5666_ == 0)
{
lean_object* v___x_5667_; uint8_t v___x_5668_; 
lean_dec(v_h__34_5571_);
v___x_5667_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__26));
v___x_5668_ = lean_string_dec_eq(v_op_5537_, v___x_5667_);
if (v___x_5668_ == 0)
{
lean_object* v___x_5669_; uint8_t v___x_5670_; 
lean_dec(v_h__35_5572_);
v___x_5669_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__27));
v___x_5670_ = lean_string_dec_eq(v_op_5537_, v___x_5669_);
if (v___x_5670_ == 0)
{
lean_object* v___x_5671_; uint8_t v___x_5672_; 
lean_dec(v_h__36_5573_);
v___x_5671_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__28));
v___x_5672_ = lean_string_dec_eq(v_op_5537_, v___x_5671_);
if (v___x_5672_ == 0)
{
lean_object* v___x_5673_; uint8_t v___x_5674_; 
lean_dec(v_h__37_5574_);
v___x_5673_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__29));
v___x_5674_ = lean_string_dec_eq(v_op_5537_, v___x_5673_);
if (v___x_5674_ == 0)
{
lean_object* v___x_5675_; uint8_t v___x_5676_; 
lean_dec(v_h__38_5575_);
v___x_5675_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__30));
v___x_5676_ = lean_string_dec_eq(v_op_5537_, v___x_5675_);
if (v___x_5676_ == 0)
{
lean_object* v___x_5677_; uint8_t v___x_5678_; 
lean_dec(v_h__39_5576_);
v___x_5677_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__31));
v___x_5678_ = lean_string_dec_eq(v_op_5537_, v___x_5677_);
if (v___x_5678_ == 0)
{
lean_object* v___x_5679_; uint8_t v___x_5680_; 
lean_dec(v_h__40_5577_);
v___x_5679_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__32));
v___x_5680_ = lean_string_dec_eq(v_op_5537_, v___x_5679_);
if (v___x_5680_ == 0)
{
lean_object* v___x_5681_; uint8_t v___x_5682_; 
lean_dec(v_h__41_5578_);
v___x_5681_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__33));
v___x_5682_ = lean_string_dec_eq(v_op_5537_, v___x_5681_);
if (v___x_5682_ == 0)
{
lean_object* v___x_5683_; uint8_t v___x_5684_; 
lean_dec(v_h__42_5579_);
v___x_5683_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__34));
v___x_5684_ = lean_string_dec_eq(v_op_5537_, v___x_5683_);
if (v___x_5684_ == 0)
{
lean_object* v___x_5685_; uint8_t v___x_5686_; 
lean_dec(v_h__43_5580_);
v___x_5685_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__35));
v___x_5686_ = lean_string_dec_eq(v_op_5537_, v___x_5685_);
if (v___x_5686_ == 0)
{
lean_object* v___x_5687_; uint8_t v___x_5688_; 
lean_dec(v_h__44_5581_);
v___x_5687_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__36));
v___x_5688_ = lean_string_dec_eq(v_op_5537_, v___x_5687_);
if (v___x_5688_ == 0)
{
lean_object* v___x_5689_; uint8_t v___x_5690_; 
lean_dec(v_h__45_5582_);
v___x_5689_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__37));
v___x_5690_ = lean_string_dec_eq(v_op_5537_, v___x_5689_);
if (v___x_5690_ == 0)
{
lean_object* v___x_5691_; uint8_t v___x_5692_; 
lean_dec(v_h__46_5583_);
v___x_5691_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__38));
v___x_5692_ = lean_string_dec_eq(v_op_5537_, v___x_5691_);
if (v___x_5692_ == 0)
{
lean_object* v___x_5693_; uint8_t v___x_5694_; 
lean_dec(v_h__47_5584_);
v___x_5693_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__39));
v___x_5694_ = lean_string_dec_eq(v_op_5537_, v___x_5693_);
if (v___x_5694_ == 0)
{
lean_object* v___x_5695_; uint8_t v___x_5696_; 
lean_dec(v_h__48_5585_);
v___x_5695_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__40));
v___x_5696_ = lean_string_dec_eq(v_op_5537_, v___x_5695_);
if (v___x_5696_ == 0)
{
lean_object* v___x_5697_; uint8_t v___x_5698_; 
lean_dec(v_h__49_5586_);
v___x_5697_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__41));
v___x_5698_ = lean_string_dec_eq(v_op_5537_, v___x_5697_);
if (v___x_5698_ == 0)
{
lean_object* v___x_5699_; uint8_t v___x_5700_; 
lean_dec(v_h__50_5587_);
v___x_5699_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__42));
v___x_5700_ = lean_string_dec_eq(v_op_5537_, v___x_5699_);
if (v___x_5700_ == 0)
{
lean_object* v___x_5701_; uint8_t v___x_5702_; 
lean_dec(v_h__51_5588_);
v___x_5701_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__6));
v___x_5702_ = lean_string_dec_eq(v_op_5537_, v___x_5701_);
if (v___x_5702_ == 0)
{
lean_object* v___x_5703_; uint8_t v___x_5704_; 
lean_dec(v_h__52_5589_);
v___x_5703_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__7));
v___x_5704_ = lean_string_dec_eq(v_op_5537_, v___x_5703_);
if (v___x_5704_ == 0)
{
lean_object* v___x_5705_; uint8_t v___x_5706_; 
lean_dec(v_h__53_5590_);
v___x_5705_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__8));
v___x_5706_ = lean_string_dec_eq(v_op_5537_, v___x_5705_);
if (v___x_5706_ == 0)
{
lean_object* v___x_5707_; uint8_t v___x_5708_; 
lean_dec(v_h__54_5591_);
v___x_5707_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__9));
v___x_5708_ = lean_string_dec_eq(v_op_5537_, v___x_5707_);
if (v___x_5708_ == 0)
{
lean_object* v___x_5709_; uint8_t v___x_5710_; 
lean_dec(v_h__55_5592_);
v___x_5709_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__10));
v___x_5710_ = lean_string_dec_eq(v_op_5537_, v___x_5709_);
if (v___x_5710_ == 0)
{
lean_object* v___x_5711_; uint8_t v___x_5712_; 
lean_dec(v_h__56_5593_);
v___x_5711_ = ((lean_object*)(lp_algalVerification_Algal_Expr_baseCost___closed__11));
v___x_5712_ = lean_string_dec_eq(v_op_5537_, v___x_5711_);
if (v___x_5712_ == 0)
{
lean_object* v___x_5713_; uint8_t v___x_5714_; 
lean_dec(v_h__57_5594_);
v___x_5713_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__43));
v___x_5714_ = lean_string_dec_eq(v_op_5537_, v___x_5713_);
if (v___x_5714_ == 0)
{
lean_object* v___x_5715_; uint8_t v___x_5716_; 
lean_dec(v_h__58_5595_);
v___x_5715_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__44));
v___x_5716_ = lean_string_dec_eq(v_op_5537_, v___x_5715_);
if (v___x_5716_ == 0)
{
lean_object* v___x_5717_; uint8_t v___x_5718_; 
lean_dec(v_h__59_5596_);
v___x_5717_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___redArg___closed__45));
v___x_5718_ = lean_string_dec_eq(v_op_5537_, v___x_5717_);
if (v___x_5718_ == 0)
{
lean_object* v___x_5719_; 
lean_dec(v_h__60_5597_);
{
lean_object* _aargs[] = {v_op_5537_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0)};
v___x_5719_ = lean_apply_m(v_h__61_5598_, 61, _aargs);
}
return v___x_5719_;
}
else
{
lean_object* v___x_5720_; lean_object* v___x_5721_; 
lean_dec(v_h__61_5598_);
lean_dec_ref(v_op_5537_);
v___x_5720_ = lean_box(0);
v___x_5721_ = lean_apply_1(v_h__60_5597_, v___x_5720_);
return v___x_5721_;
}
}
else
{
lean_object* v___x_5722_; lean_object* v___x_5723_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec_ref(v_op_5537_);
v___x_5722_ = lean_box(0);
v___x_5723_ = lean_apply_1(v_h__59_5596_, v___x_5722_);
return v___x_5723_;
}
}
else
{
lean_object* v___x_5724_; lean_object* v___x_5725_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec_ref(v_op_5537_);
v___x_5724_ = lean_box(0);
v___x_5725_ = lean_apply_1(v_h__58_5595_, v___x_5724_);
return v___x_5725_;
}
}
else
{
lean_object* v___x_5726_; lean_object* v___x_5727_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec_ref(v_op_5537_);
v___x_5726_ = lean_box(0);
v___x_5727_ = lean_apply_1(v_h__57_5594_, v___x_5726_);
return v___x_5727_;
}
}
else
{
lean_object* v___x_5728_; lean_object* v___x_5729_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec_ref(v_op_5537_);
v___x_5728_ = lean_box(0);
v___x_5729_ = lean_apply_1(v_h__56_5593_, v___x_5728_);
return v___x_5729_;
}
}
else
{
lean_object* v___x_5730_; lean_object* v___x_5731_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec_ref(v_op_5537_);
v___x_5730_ = lean_box(0);
v___x_5731_ = lean_apply_1(v_h__55_5592_, v___x_5730_);
return v___x_5731_;
}
}
else
{
lean_object* v___x_5732_; lean_object* v___x_5733_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec_ref(v_op_5537_);
v___x_5732_ = lean_box(0);
v___x_5733_ = lean_apply_1(v_h__54_5591_, v___x_5732_);
return v___x_5733_;
}
}
else
{
lean_object* v___x_5734_; lean_object* v___x_5735_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec_ref(v_op_5537_);
v___x_5734_ = lean_box(0);
v___x_5735_ = lean_apply_1(v_h__53_5590_, v___x_5734_);
return v___x_5735_;
}
}
else
{
lean_object* v___x_5736_; lean_object* v___x_5737_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec_ref(v_op_5537_);
v___x_5736_ = lean_box(0);
v___x_5737_ = lean_apply_1(v_h__52_5589_, v___x_5736_);
return v___x_5737_;
}
}
else
{
lean_object* v___x_5738_; lean_object* v___x_5739_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec_ref(v_op_5537_);
v___x_5738_ = lean_box(0);
v___x_5739_ = lean_apply_1(v_h__51_5588_, v___x_5738_);
return v___x_5739_;
}
}
else
{
lean_object* v___x_5740_; lean_object* v___x_5741_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec_ref(v_op_5537_);
v___x_5740_ = lean_box(0);
v___x_5741_ = lean_apply_1(v_h__50_5587_, v___x_5740_);
return v___x_5741_;
}
}
else
{
lean_object* v___x_5742_; lean_object* v___x_5743_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec_ref(v_op_5537_);
v___x_5742_ = lean_box(0);
v___x_5743_ = lean_apply_1(v_h__49_5586_, v___x_5742_);
return v___x_5743_;
}
}
else
{
lean_object* v___x_5744_; lean_object* v___x_5745_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec_ref(v_op_5537_);
v___x_5744_ = lean_box(0);
v___x_5745_ = lean_apply_1(v_h__48_5585_, v___x_5744_);
return v___x_5745_;
}
}
else
{
lean_object* v___x_5746_; lean_object* v___x_5747_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec_ref(v_op_5537_);
v___x_5746_ = lean_box(0);
v___x_5747_ = lean_apply_1(v_h__47_5584_, v___x_5746_);
return v___x_5747_;
}
}
else
{
lean_object* v___x_5748_; lean_object* v___x_5749_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec_ref(v_op_5537_);
v___x_5748_ = lean_box(0);
v___x_5749_ = lean_apply_1(v_h__46_5583_, v___x_5748_);
return v___x_5749_;
}
}
else
{
lean_object* v___x_5750_; lean_object* v___x_5751_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec_ref(v_op_5537_);
v___x_5750_ = lean_box(0);
v___x_5751_ = lean_apply_1(v_h__45_5582_, v___x_5750_);
return v___x_5751_;
}
}
else
{
lean_object* v___x_5752_; lean_object* v___x_5753_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec_ref(v_op_5537_);
v___x_5752_ = lean_box(0);
v___x_5753_ = lean_apply_1(v_h__44_5581_, v___x_5752_);
return v___x_5753_;
}
}
else
{
lean_object* v___x_5754_; lean_object* v___x_5755_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec_ref(v_op_5537_);
v___x_5754_ = lean_box(0);
v___x_5755_ = lean_apply_1(v_h__43_5580_, v___x_5754_);
return v___x_5755_;
}
}
else
{
lean_object* v___x_5756_; lean_object* v___x_5757_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec_ref(v_op_5537_);
v___x_5756_ = lean_box(0);
v___x_5757_ = lean_apply_1(v_h__42_5579_, v___x_5756_);
return v___x_5757_;
}
}
else
{
lean_object* v___x_5758_; lean_object* v___x_5759_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec_ref(v_op_5537_);
v___x_5758_ = lean_box(0);
v___x_5759_ = lean_apply_1(v_h__41_5578_, v___x_5758_);
return v___x_5759_;
}
}
else
{
lean_object* v___x_5760_; lean_object* v___x_5761_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec_ref(v_op_5537_);
v___x_5760_ = lean_box(0);
v___x_5761_ = lean_apply_1(v_h__40_5577_, v___x_5760_);
return v___x_5761_;
}
}
else
{
lean_object* v___x_5762_; lean_object* v___x_5763_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec_ref(v_op_5537_);
v___x_5762_ = lean_box(0);
v___x_5763_ = lean_apply_1(v_h__39_5576_, v___x_5762_);
return v___x_5763_;
}
}
else
{
lean_object* v___x_5764_; lean_object* v___x_5765_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec_ref(v_op_5537_);
v___x_5764_ = lean_box(0);
v___x_5765_ = lean_apply_1(v_h__38_5575_, v___x_5764_);
return v___x_5765_;
}
}
else
{
lean_object* v___x_5766_; lean_object* v___x_5767_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec_ref(v_op_5537_);
v___x_5766_ = lean_box(0);
v___x_5767_ = lean_apply_1(v_h__37_5574_, v___x_5766_);
return v___x_5767_;
}
}
else
{
lean_object* v___x_5768_; lean_object* v___x_5769_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec_ref(v_op_5537_);
v___x_5768_ = lean_box(0);
v___x_5769_ = lean_apply_1(v_h__36_5573_, v___x_5768_);
return v___x_5769_;
}
}
else
{
lean_object* v___x_5770_; lean_object* v___x_5771_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec_ref(v_op_5537_);
v___x_5770_ = lean_box(0);
v___x_5771_ = lean_apply_1(v_h__35_5572_, v___x_5770_);
return v___x_5771_;
}
}
else
{
lean_object* v___x_5772_; lean_object* v___x_5773_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec_ref(v_op_5537_);
v___x_5772_ = lean_box(0);
v___x_5773_ = lean_apply_1(v_h__34_5571_, v___x_5772_);
return v___x_5773_;
}
}
else
{
lean_object* v___x_5774_; lean_object* v___x_5775_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec_ref(v_op_5537_);
v___x_5774_ = lean_box(0);
v___x_5775_ = lean_apply_1(v_h__33_5570_, v___x_5774_);
return v___x_5775_;
}
}
else
{
lean_object* v___x_5776_; lean_object* v___x_5777_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec_ref(v_op_5537_);
v___x_5776_ = lean_box(0);
v___x_5777_ = lean_apply_1(v_h__32_5569_, v___x_5776_);
return v___x_5777_;
}
}
else
{
lean_object* v___x_5778_; lean_object* v___x_5779_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec_ref(v_op_5537_);
v___x_5778_ = lean_box(0);
v___x_5779_ = lean_apply_1(v_h__31_5568_, v___x_5778_);
return v___x_5779_;
}
}
else
{
lean_object* v___x_5780_; lean_object* v___x_5781_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec_ref(v_op_5537_);
v___x_5780_ = lean_box(0);
v___x_5781_ = lean_apply_1(v_h__30_5567_, v___x_5780_);
return v___x_5781_;
}
}
else
{
lean_object* v___x_5782_; lean_object* v___x_5783_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec_ref(v_op_5537_);
v___x_5782_ = lean_box(0);
v___x_5783_ = lean_apply_1(v_h__29_5566_, v___x_5782_);
return v___x_5783_;
}
}
else
{
lean_object* v___x_5784_; lean_object* v___x_5785_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec_ref(v_op_5537_);
v___x_5784_ = lean_box(0);
v___x_5785_ = lean_apply_1(v_h__28_5565_, v___x_5784_);
return v___x_5785_;
}
}
else
{
lean_object* v___x_5786_; lean_object* v___x_5787_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec_ref(v_op_5537_);
v___x_5786_ = lean_box(0);
v___x_5787_ = lean_apply_1(v_h__27_5564_, v___x_5786_);
return v___x_5787_;
}
}
else
{
lean_object* v___x_5788_; lean_object* v___x_5789_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec_ref(v_op_5537_);
v___x_5788_ = lean_box(0);
v___x_5789_ = lean_apply_1(v_h__26_5563_, v___x_5788_);
return v___x_5789_;
}
}
else
{
lean_object* v___x_5790_; lean_object* v___x_5791_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec_ref(v_op_5537_);
v___x_5790_ = lean_box(0);
v___x_5791_ = lean_apply_1(v_h__25_5562_, v___x_5790_);
return v___x_5791_;
}
}
else
{
lean_object* v___x_5792_; lean_object* v___x_5793_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec_ref(v_op_5537_);
v___x_5792_ = lean_box(0);
v___x_5793_ = lean_apply_1(v_h__24_5561_, v___x_5792_);
return v___x_5793_;
}
}
else
{
lean_object* v___x_5794_; lean_object* v___x_5795_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec_ref(v_op_5537_);
v___x_5794_ = lean_box(0);
v___x_5795_ = lean_apply_1(v_h__23_5560_, v___x_5794_);
return v___x_5795_;
}
}
else
{
lean_object* v___x_5796_; lean_object* v___x_5797_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec_ref(v_op_5537_);
v___x_5796_ = lean_box(0);
v___x_5797_ = lean_apply_1(v_h__22_5559_, v___x_5796_);
return v___x_5797_;
}
}
else
{
lean_object* v___x_5798_; lean_object* v___x_5799_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec_ref(v_op_5537_);
v___x_5798_ = lean_box(0);
v___x_5799_ = lean_apply_1(v_h__21_5558_, v___x_5798_);
return v___x_5799_;
}
}
else
{
lean_object* v___x_5800_; lean_object* v___x_5801_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec_ref(v_op_5537_);
v___x_5800_ = lean_box(0);
v___x_5801_ = lean_apply_1(v_h__20_5557_, v___x_5800_);
return v___x_5801_;
}
}
else
{
lean_object* v___x_5802_; lean_object* v___x_5803_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec_ref(v_op_5537_);
v___x_5802_ = lean_box(0);
v___x_5803_ = lean_apply_1(v_h__19_5556_, v___x_5802_);
return v___x_5803_;
}
}
else
{
lean_object* v___x_5804_; lean_object* v___x_5805_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec_ref(v_op_5537_);
v___x_5804_ = lean_box(0);
v___x_5805_ = lean_apply_1(v_h__18_5555_, v___x_5804_);
return v___x_5805_;
}
}
else
{
lean_object* v___x_5806_; lean_object* v___x_5807_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec(v_h__18_5555_);
lean_dec_ref(v_op_5537_);
v___x_5806_ = lean_box(0);
v___x_5807_ = lean_apply_1(v_h__17_5554_, v___x_5806_);
return v___x_5807_;
}
}
else
{
lean_object* v___x_5808_; lean_object* v___x_5809_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec(v_h__18_5555_);
lean_dec(v_h__17_5554_);
lean_dec_ref(v_op_5537_);
v___x_5808_ = lean_box(0);
v___x_5809_ = lean_apply_1(v_h__16_5553_, v___x_5808_);
return v___x_5809_;
}
}
else
{
lean_object* v___x_5810_; lean_object* v___x_5811_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec(v_h__18_5555_);
lean_dec(v_h__17_5554_);
lean_dec(v_h__16_5553_);
lean_dec_ref(v_op_5537_);
v___x_5810_ = lean_box(0);
v___x_5811_ = lean_apply_1(v_h__15_5552_, v___x_5810_);
return v___x_5811_;
}
}
else
{
lean_object* v___x_5812_; lean_object* v___x_5813_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec(v_h__18_5555_);
lean_dec(v_h__17_5554_);
lean_dec(v_h__16_5553_);
lean_dec(v_h__15_5552_);
lean_dec_ref(v_op_5537_);
v___x_5812_ = lean_box(0);
v___x_5813_ = lean_apply_1(v_h__14_5551_, v___x_5812_);
return v___x_5813_;
}
}
else
{
lean_object* v___x_5814_; lean_object* v___x_5815_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec(v_h__18_5555_);
lean_dec(v_h__17_5554_);
lean_dec(v_h__16_5553_);
lean_dec(v_h__15_5552_);
lean_dec(v_h__14_5551_);
lean_dec_ref(v_op_5537_);
v___x_5814_ = lean_box(0);
v___x_5815_ = lean_apply_1(v_h__13_5550_, v___x_5814_);
return v___x_5815_;
}
}
else
{
lean_object* v___x_5816_; lean_object* v___x_5817_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec(v_h__18_5555_);
lean_dec(v_h__17_5554_);
lean_dec(v_h__16_5553_);
lean_dec(v_h__15_5552_);
lean_dec(v_h__14_5551_);
lean_dec(v_h__13_5550_);
lean_dec_ref(v_op_5537_);
v___x_5816_ = lean_box(0);
v___x_5817_ = lean_apply_1(v_h__12_5549_, v___x_5816_);
return v___x_5817_;
}
}
else
{
lean_object* v___x_5818_; lean_object* v___x_5819_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec(v_h__18_5555_);
lean_dec(v_h__17_5554_);
lean_dec(v_h__16_5553_);
lean_dec(v_h__15_5552_);
lean_dec(v_h__14_5551_);
lean_dec(v_h__13_5550_);
lean_dec(v_h__12_5549_);
lean_dec_ref(v_op_5537_);
v___x_5818_ = lean_box(0);
v___x_5819_ = lean_apply_1(v_h__11_5548_, v___x_5818_);
return v___x_5819_;
}
}
else
{
lean_object* v___x_5820_; lean_object* v___x_5821_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec(v_h__18_5555_);
lean_dec(v_h__17_5554_);
lean_dec(v_h__16_5553_);
lean_dec(v_h__15_5552_);
lean_dec(v_h__14_5551_);
lean_dec(v_h__13_5550_);
lean_dec(v_h__12_5549_);
lean_dec(v_h__11_5548_);
lean_dec_ref(v_op_5537_);
v___x_5820_ = lean_box(0);
v___x_5821_ = lean_apply_1(v_h__10_5547_, v___x_5820_);
return v___x_5821_;
}
}
else
{
lean_object* v___x_5822_; lean_object* v___x_5823_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec(v_h__18_5555_);
lean_dec(v_h__17_5554_);
lean_dec(v_h__16_5553_);
lean_dec(v_h__15_5552_);
lean_dec(v_h__14_5551_);
lean_dec(v_h__13_5550_);
lean_dec(v_h__12_5549_);
lean_dec(v_h__11_5548_);
lean_dec(v_h__10_5547_);
lean_dec_ref(v_op_5537_);
v___x_5822_ = lean_box(0);
v___x_5823_ = lean_apply_1(v_h__9_5546_, v___x_5822_);
return v___x_5823_;
}
}
else
{
lean_object* v___x_5824_; lean_object* v___x_5825_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec(v_h__18_5555_);
lean_dec(v_h__17_5554_);
lean_dec(v_h__16_5553_);
lean_dec(v_h__15_5552_);
lean_dec(v_h__14_5551_);
lean_dec(v_h__13_5550_);
lean_dec(v_h__12_5549_);
lean_dec(v_h__11_5548_);
lean_dec(v_h__10_5547_);
lean_dec(v_h__9_5546_);
lean_dec_ref(v_op_5537_);
v___x_5824_ = lean_box(0);
v___x_5825_ = lean_apply_1(v_h__8_5545_, v___x_5824_);
return v___x_5825_;
}
}
else
{
lean_object* v___x_5826_; lean_object* v___x_5827_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec(v_h__18_5555_);
lean_dec(v_h__17_5554_);
lean_dec(v_h__16_5553_);
lean_dec(v_h__15_5552_);
lean_dec(v_h__14_5551_);
lean_dec(v_h__13_5550_);
lean_dec(v_h__12_5549_);
lean_dec(v_h__11_5548_);
lean_dec(v_h__10_5547_);
lean_dec(v_h__9_5546_);
lean_dec(v_h__8_5545_);
lean_dec_ref(v_op_5537_);
v___x_5826_ = lean_box(0);
v___x_5827_ = lean_apply_1(v_h__7_5544_, v___x_5826_);
return v___x_5827_;
}
}
else
{
lean_object* v___x_5828_; lean_object* v___x_5829_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec(v_h__18_5555_);
lean_dec(v_h__17_5554_);
lean_dec(v_h__16_5553_);
lean_dec(v_h__15_5552_);
lean_dec(v_h__14_5551_);
lean_dec(v_h__13_5550_);
lean_dec(v_h__12_5549_);
lean_dec(v_h__11_5548_);
lean_dec(v_h__10_5547_);
lean_dec(v_h__9_5546_);
lean_dec(v_h__8_5545_);
lean_dec(v_h__7_5544_);
lean_dec_ref(v_op_5537_);
v___x_5828_ = lean_box(0);
v___x_5829_ = lean_apply_1(v_h__6_5543_, v___x_5828_);
return v___x_5829_;
}
}
else
{
lean_object* v___x_5830_; lean_object* v___x_5831_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec(v_h__18_5555_);
lean_dec(v_h__17_5554_);
lean_dec(v_h__16_5553_);
lean_dec(v_h__15_5552_);
lean_dec(v_h__14_5551_);
lean_dec(v_h__13_5550_);
lean_dec(v_h__12_5549_);
lean_dec(v_h__11_5548_);
lean_dec(v_h__10_5547_);
lean_dec(v_h__9_5546_);
lean_dec(v_h__8_5545_);
lean_dec(v_h__7_5544_);
lean_dec(v_h__6_5543_);
lean_dec_ref(v_op_5537_);
v___x_5830_ = lean_box(0);
v___x_5831_ = lean_apply_1(v_h__5_5542_, v___x_5830_);
return v___x_5831_;
}
}
else
{
lean_object* v___x_5832_; lean_object* v___x_5833_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec(v_h__18_5555_);
lean_dec(v_h__17_5554_);
lean_dec(v_h__16_5553_);
lean_dec(v_h__15_5552_);
lean_dec(v_h__14_5551_);
lean_dec(v_h__13_5550_);
lean_dec(v_h__12_5549_);
lean_dec(v_h__11_5548_);
lean_dec(v_h__10_5547_);
lean_dec(v_h__9_5546_);
lean_dec(v_h__8_5545_);
lean_dec(v_h__7_5544_);
lean_dec(v_h__6_5543_);
lean_dec(v_h__5_5542_);
lean_dec_ref(v_op_5537_);
v___x_5832_ = lean_box(0);
v___x_5833_ = lean_apply_1(v_h__4_5541_, v___x_5832_);
return v___x_5833_;
}
}
else
{
lean_object* v___x_5834_; lean_object* v___x_5835_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec(v_h__18_5555_);
lean_dec(v_h__17_5554_);
lean_dec(v_h__16_5553_);
lean_dec(v_h__15_5552_);
lean_dec(v_h__14_5551_);
lean_dec(v_h__13_5550_);
lean_dec(v_h__12_5549_);
lean_dec(v_h__11_5548_);
lean_dec(v_h__10_5547_);
lean_dec(v_h__9_5546_);
lean_dec(v_h__8_5545_);
lean_dec(v_h__7_5544_);
lean_dec(v_h__6_5543_);
lean_dec(v_h__5_5542_);
lean_dec(v_h__4_5541_);
lean_dec_ref(v_op_5537_);
v___x_5834_ = lean_box(0);
v___x_5835_ = lean_apply_1(v_h__3_5540_, v___x_5834_);
return v___x_5835_;
}
}
else
{
lean_object* v___x_5836_; lean_object* v___x_5837_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec(v_h__18_5555_);
lean_dec(v_h__17_5554_);
lean_dec(v_h__16_5553_);
lean_dec(v_h__15_5552_);
lean_dec(v_h__14_5551_);
lean_dec(v_h__13_5550_);
lean_dec(v_h__12_5549_);
lean_dec(v_h__11_5548_);
lean_dec(v_h__10_5547_);
lean_dec(v_h__9_5546_);
lean_dec(v_h__8_5545_);
lean_dec(v_h__7_5544_);
lean_dec(v_h__6_5543_);
lean_dec(v_h__5_5542_);
lean_dec(v_h__4_5541_);
lean_dec(v_h__3_5540_);
lean_dec_ref(v_op_5537_);
v___x_5836_ = lean_box(0);
v___x_5837_ = lean_apply_1(v_h__2_5539_, v___x_5836_);
return v___x_5837_;
}
}
else
{
lean_object* v___x_5838_; lean_object* v___x_5839_; 
lean_dec(v_h__61_5598_);
lean_dec(v_h__60_5597_);
lean_dec(v_h__59_5596_);
lean_dec(v_h__58_5595_);
lean_dec(v_h__57_5594_);
lean_dec(v_h__56_5593_);
lean_dec(v_h__55_5592_);
lean_dec(v_h__54_5591_);
lean_dec(v_h__53_5590_);
lean_dec(v_h__52_5589_);
lean_dec(v_h__51_5588_);
lean_dec(v_h__50_5587_);
lean_dec(v_h__49_5586_);
lean_dec(v_h__48_5585_);
lean_dec(v_h__47_5584_);
lean_dec(v_h__46_5583_);
lean_dec(v_h__45_5582_);
lean_dec(v_h__44_5581_);
lean_dec(v_h__43_5580_);
lean_dec(v_h__42_5579_);
lean_dec(v_h__41_5578_);
lean_dec(v_h__40_5577_);
lean_dec(v_h__39_5576_);
lean_dec(v_h__38_5575_);
lean_dec(v_h__37_5574_);
lean_dec(v_h__36_5573_);
lean_dec(v_h__35_5572_);
lean_dec(v_h__34_5571_);
lean_dec(v_h__33_5570_);
lean_dec(v_h__32_5569_);
lean_dec(v_h__31_5568_);
lean_dec(v_h__30_5567_);
lean_dec(v_h__29_5566_);
lean_dec(v_h__28_5565_);
lean_dec(v_h__27_5564_);
lean_dec(v_h__26_5563_);
lean_dec(v_h__25_5562_);
lean_dec(v_h__24_5561_);
lean_dec(v_h__23_5560_);
lean_dec(v_h__22_5559_);
lean_dec(v_h__21_5558_);
lean_dec(v_h__20_5557_);
lean_dec(v_h__19_5556_);
lean_dec(v_h__18_5555_);
lean_dec(v_h__17_5554_);
lean_dec(v_h__16_5553_);
lean_dec(v_h__15_5552_);
lean_dec(v_h__14_5551_);
lean_dec(v_h__13_5550_);
lean_dec(v_h__12_5549_);
lean_dec(v_h__11_5548_);
lean_dec(v_h__10_5547_);
lean_dec(v_h__9_5546_);
lean_dec(v_h__8_5545_);
lean_dec(v_h__7_5544_);
lean_dec(v_h__6_5543_);
lean_dec(v_h__5_5542_);
lean_dec(v_h__4_5541_);
lean_dec(v_h__3_5540_);
lean_dec(v_h__2_5539_);
lean_dec_ref(v_op_5537_);
v___x_5838_ = lean_box(0);
v___x_5839_ = lean_apply_1(v_h__1_5538_, v___x_5838_);
return v___x_5839_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter___boxed(lean_object** _args){
lean_object* v_motive_5840_ = _args[0];
lean_object* v_op_5841_ = _args[1];
lean_object* v_h__1_5842_ = _args[2];
lean_object* v_h__2_5843_ = _args[3];
lean_object* v_h__3_5844_ = _args[4];
lean_object* v_h__4_5845_ = _args[5];
lean_object* v_h__5_5846_ = _args[6];
lean_object* v_h__6_5847_ = _args[7];
lean_object* v_h__7_5848_ = _args[8];
lean_object* v_h__8_5849_ = _args[9];
lean_object* v_h__9_5850_ = _args[10];
lean_object* v_h__10_5851_ = _args[11];
lean_object* v_h__11_5852_ = _args[12];
lean_object* v_h__12_5853_ = _args[13];
lean_object* v_h__13_5854_ = _args[14];
lean_object* v_h__14_5855_ = _args[15];
lean_object* v_h__15_5856_ = _args[16];
lean_object* v_h__16_5857_ = _args[17];
lean_object* v_h__17_5858_ = _args[18];
lean_object* v_h__18_5859_ = _args[19];
lean_object* v_h__19_5860_ = _args[20];
lean_object* v_h__20_5861_ = _args[21];
lean_object* v_h__21_5862_ = _args[22];
lean_object* v_h__22_5863_ = _args[23];
lean_object* v_h__23_5864_ = _args[24];
lean_object* v_h__24_5865_ = _args[25];
lean_object* v_h__25_5866_ = _args[26];
lean_object* v_h__26_5867_ = _args[27];
lean_object* v_h__27_5868_ = _args[28];
lean_object* v_h__28_5869_ = _args[29];
lean_object* v_h__29_5870_ = _args[30];
lean_object* v_h__30_5871_ = _args[31];
lean_object* v_h__31_5872_ = _args[32];
lean_object* v_h__32_5873_ = _args[33];
lean_object* v_h__33_5874_ = _args[34];
lean_object* v_h__34_5875_ = _args[35];
lean_object* v_h__35_5876_ = _args[36];
lean_object* v_h__36_5877_ = _args[37];
lean_object* v_h__37_5878_ = _args[38];
lean_object* v_h__38_5879_ = _args[39];
lean_object* v_h__39_5880_ = _args[40];
lean_object* v_h__40_5881_ = _args[41];
lean_object* v_h__41_5882_ = _args[42];
lean_object* v_h__42_5883_ = _args[43];
lean_object* v_h__43_5884_ = _args[44];
lean_object* v_h__44_5885_ = _args[45];
lean_object* v_h__45_5886_ = _args[46];
lean_object* v_h__46_5887_ = _args[47];
lean_object* v_h__47_5888_ = _args[48];
lean_object* v_h__48_5889_ = _args[49];
lean_object* v_h__49_5890_ = _args[50];
lean_object* v_h__50_5891_ = _args[51];
lean_object* v_h__51_5892_ = _args[52];
lean_object* v_h__52_5893_ = _args[53];
lean_object* v_h__53_5894_ = _args[54];
lean_object* v_h__54_5895_ = _args[55];
lean_object* v_h__55_5896_ = _args[56];
lean_object* v_h__56_5897_ = _args[57];
lean_object* v_h__57_5898_ = _args[58];
lean_object* v_h__58_5899_ = _args[59];
lean_object* v_h__59_5900_ = _args[60];
lean_object* v_h__60_5901_ = _args[61];
lean_object* v_h__61_5902_ = _args[62];
_start:
{
lean_object* v_res_5903_; 
v_res_5903_ = lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__32_splitter(v_motive_5840_, v_op_5841_, v_h__1_5842_, v_h__2_5843_, v_h__3_5844_, v_h__4_5845_, v_h__5_5846_, v_h__6_5847_, v_h__7_5848_, v_h__8_5849_, v_h__9_5850_, v_h__10_5851_, v_h__11_5852_, v_h__12_5853_, v_h__13_5854_, v_h__14_5855_, v_h__15_5856_, v_h__16_5857_, v_h__17_5858_, v_h__18_5859_, v_h__19_5860_, v_h__20_5861_, v_h__21_5862_, v_h__22_5863_, v_h__23_5864_, v_h__24_5865_, v_h__25_5866_, v_h__26_5867_, v_h__27_5868_, v_h__28_5869_, v_h__29_5870_, v_h__30_5871_, v_h__31_5872_, v_h__32_5873_, v_h__33_5874_, v_h__34_5875_, v_h__35_5876_, v_h__36_5877_, v_h__37_5878_, v_h__38_5879_, v_h__39_5880_, v_h__40_5881_, v_h__41_5882_, v_h__42_5883_, v_h__43_5884_, v_h__44_5885_, v_h__45_5886_, v_h__46_5887_, v_h__47_5888_, v_h__48_5889_, v_h__49_5890_, v_h__50_5891_, v_h__51_5892_, v_h__52_5893_, v_h__53_5894_, v_h__54_5895_, v_h__55_5896_, v_h__56_5897_, v_h__57_5898_, v_h__58_5899_, v_h__59_5900_, v_h__60_5901_, v_h__61_5902_);
return v_res_5903_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_asList_match__1_splitter___redArg(lean_object* v_x_5904_, lean_object* v_h__1_5905_, lean_object* v_h__2_5906_){
_start:
{
if (lean_obj_tag(v_x_5904_) == 4)
{
lean_object* v_values_5907_; lean_object* v___x_5908_; 
lean_dec(v_h__2_5906_);
v_values_5907_ = lean_ctor_get(v_x_5904_, 0);
lean_inc(v_values_5907_);
lean_dec_ref_known(v_x_5904_, 1);
v___x_5908_ = lean_apply_1(v_h__1_5905_, v_values_5907_);
return v___x_5908_;
}
else
{
lean_object* v___x_5909_; 
lean_dec(v_h__1_5905_);
v___x_5909_ = lean_apply_2(v_h__2_5906_, v_x_5904_, lean_box(0));
return v___x_5909_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_asList_match__1_splitter(lean_object* v_motive_5910_, lean_object* v_x_5911_, lean_object* v_h__1_5912_, lean_object* v_h__2_5913_){
_start:
{
if (lean_obj_tag(v_x_5911_) == 4)
{
lean_object* v_values_5914_; lean_object* v___x_5915_; 
lean_dec(v_h__2_5913_);
v_values_5914_ = lean_ctor_get(v_x_5911_, 0);
lean_inc(v_values_5914_);
lean_dec_ref_known(v_x_5911_, 1);
v___x_5915_ = lean_apply_1(v_h__1_5912_, v_values_5914_);
return v___x_5915_;
}
else
{
lean_object* v___x_5916_; 
lean_dec(v_h__1_5912_);
v___x_5916_ = lean_apply_2(v_h__2_5913_, v_x_5911_, lean_box(0));
return v___x_5916_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__1_splitter___redArg(lean_object* v_rest_5917_, lean_object* v_h__1_5918_, lean_object* v_h__2_5919_){
_start:
{
if (lean_obj_tag(v_rest_5917_) == 1)
{
lean_object* v_rest_5920_; 
v_rest_5920_ = lean_ctor_get(v_rest_5917_, 1);
if (lean_obj_tag(v_rest_5920_) == 1)
{
lean_object* v_rest_5921_; 
v_rest_5921_ = lean_ctor_get(v_rest_5920_, 1);
if (lean_obj_tag(v_rest_5921_) == 0)
{
lean_object* v_value_5922_; lean_object* v_value_5923_; lean_object* v___x_5924_; 
lean_inc_ref(v_rest_5920_);
lean_dec(v_h__2_5919_);
v_value_5922_ = lean_ctor_get(v_rest_5917_, 0);
lean_inc(v_value_5922_);
lean_dec_ref_known(v_rest_5917_, 2);
v_value_5923_ = lean_ctor_get(v_rest_5920_, 0);
lean_inc(v_value_5923_);
lean_dec_ref_known(v_rest_5920_, 2);
v___x_5924_ = lean_apply_2(v_h__1_5918_, v_value_5922_, v_value_5923_);
return v___x_5924_;
}
else
{
lean_object* v___x_5925_; 
lean_dec(v_h__1_5918_);
v___x_5925_ = lean_apply_2(v_h__2_5919_, v_rest_5917_, lean_box(0));
return v___x_5925_;
}
}
else
{
lean_object* v___x_5926_; 
lean_dec(v_h__1_5918_);
v___x_5926_ = lean_apply_2(v_h__2_5919_, v_rest_5917_, lean_box(0));
return v___x_5926_;
}
}
else
{
lean_object* v___x_5927_; 
lean_dec(v_h__1_5918_);
v___x_5927_ = lean_apply_2(v_h__2_5919_, v_rest_5917_, lean_box(0));
return v___x_5927_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__1_splitter(lean_object* v_motive_5928_, lean_object* v_rest_5929_, lean_object* v_h__1_5930_, lean_object* v_h__2_5931_){
_start:
{
if (lean_obj_tag(v_rest_5929_) == 1)
{
lean_object* v_rest_5932_; 
v_rest_5932_ = lean_ctor_get(v_rest_5929_, 1);
if (lean_obj_tag(v_rest_5932_) == 1)
{
lean_object* v_rest_5933_; 
v_rest_5933_ = lean_ctor_get(v_rest_5932_, 1);
if (lean_obj_tag(v_rest_5933_) == 0)
{
lean_object* v_value_5934_; lean_object* v_value_5935_; lean_object* v___x_5936_; 
lean_inc_ref(v_rest_5932_);
lean_dec(v_h__2_5931_);
v_value_5934_ = lean_ctor_get(v_rest_5929_, 0);
lean_inc(v_value_5934_);
lean_dec_ref_known(v_rest_5929_, 2);
v_value_5935_ = lean_ctor_get(v_rest_5932_, 0);
lean_inc(v_value_5935_);
lean_dec_ref_known(v_rest_5932_, 2);
v___x_5936_ = lean_apply_2(v_h__1_5930_, v_value_5934_, v_value_5935_);
return v___x_5936_;
}
else
{
lean_object* v___x_5937_; 
lean_dec(v_h__1_5930_);
v___x_5937_ = lean_apply_2(v_h__2_5931_, v_rest_5929_, lean_box(0));
return v___x_5937_;
}
}
else
{
lean_object* v___x_5938_; 
lean_dec(v_h__1_5930_);
v___x_5938_ = lean_apply_2(v_h__2_5931_, v_rest_5929_, lean_box(0));
return v___x_5938_;
}
}
else
{
lean_object* v___x_5939_; 
lean_dec(v_h__1_5930_);
v___x_5939_ = lean_apply_2(v_h__2_5931_, v_rest_5929_, lean_box(0));
return v___x_5939_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__5_splitter___redArg(lean_object* v_rest_5940_, lean_object* v_h__1_5941_, lean_object* v_h__2_5942_){
_start:
{
if (lean_obj_tag(v_rest_5940_) == 1)
{
lean_object* v_rest_5943_; 
v_rest_5943_ = lean_ctor_get(v_rest_5940_, 1);
if (lean_obj_tag(v_rest_5943_) == 0)
{
lean_object* v_value_5944_; lean_object* v___x_5945_; 
lean_dec(v_h__2_5942_);
v_value_5944_ = lean_ctor_get(v_rest_5940_, 0);
lean_inc(v_value_5944_);
lean_dec_ref_known(v_rest_5940_, 2);
v___x_5945_ = lean_apply_1(v_h__1_5941_, v_value_5944_);
return v___x_5945_;
}
else
{
lean_object* v___x_5946_; 
lean_dec(v_h__1_5941_);
v___x_5946_ = lean_apply_2(v_h__2_5942_, v_rest_5940_, lean_box(0));
return v___x_5946_;
}
}
else
{
lean_object* v___x_5947_; 
lean_dec(v_h__1_5941_);
v___x_5947_ = lean_apply_2(v_h__2_5942_, v_rest_5940_, lean_box(0));
return v___x_5947_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__5_splitter(lean_object* v_motive_5948_, lean_object* v_rest_5949_, lean_object* v_h__1_5950_, lean_object* v_h__2_5951_){
_start:
{
if (lean_obj_tag(v_rest_5949_) == 1)
{
lean_object* v_rest_5952_; 
v_rest_5952_ = lean_ctor_get(v_rest_5949_, 1);
if (lean_obj_tag(v_rest_5952_) == 0)
{
lean_object* v_value_5953_; lean_object* v___x_5954_; 
lean_dec(v_h__2_5951_);
v_value_5953_ = lean_ctor_get(v_rest_5949_, 0);
lean_inc(v_value_5953_);
lean_dec_ref_known(v_rest_5949_, 2);
v___x_5954_ = lean_apply_1(v_h__1_5950_, v_value_5953_);
return v___x_5954_;
}
else
{
lean_object* v___x_5955_; 
lean_dec(v_h__1_5950_);
v___x_5955_ = lean_apply_2(v_h__2_5951_, v_rest_5949_, lean_box(0));
return v___x_5955_;
}
}
else
{
lean_object* v___x_5956_; 
lean_dec(v_h__1_5950_);
v___x_5956_ = lean_apply_2(v_h__2_5951_, v_rest_5949_, lean_box(0));
return v___x_5956_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter___redArg(lean_object* v_op_5960_, lean_object* v_h__1_5961_, lean_object* v_h__2_5962_, lean_object* v_h__3_5963_, lean_object* v_h__4_5964_){
_start:
{
lean_object* v___x_5965_; uint8_t v___x_5966_; 
v___x_5965_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter___redArg___closed__0));
v___x_5966_ = lean_string_dec_eq(v_op_5960_, v___x_5965_);
if (v___x_5966_ == 0)
{
lean_object* v___x_5967_; uint8_t v___x_5968_; 
lean_dec(v_h__1_5961_);
v___x_5967_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter___redArg___closed__1));
v___x_5968_ = lean_string_dec_eq(v_op_5960_, v___x_5967_);
if (v___x_5968_ == 0)
{
lean_object* v___x_5969_; uint8_t v___x_5970_; 
lean_dec(v_h__2_5962_);
v___x_5969_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter___redArg___closed__2));
v___x_5970_ = lean_string_dec_eq(v_op_5960_, v___x_5969_);
if (v___x_5970_ == 0)
{
lean_object* v___x_5971_; 
lean_dec(v_h__3_5963_);
v___x_5971_ = lean_apply_4(v_h__4_5964_, v_op_5960_, lean_box(0), lean_box(0), lean_box(0));
return v___x_5971_;
}
else
{
lean_object* v___x_5972_; lean_object* v___x_5973_; 
lean_dec(v_h__4_5964_);
lean_dec_ref(v_op_5960_);
v___x_5972_ = lean_box(0);
v___x_5973_ = lean_apply_1(v_h__3_5963_, v___x_5972_);
return v___x_5973_;
}
}
else
{
lean_object* v___x_5974_; lean_object* v___x_5975_; 
lean_dec(v_h__4_5964_);
lean_dec(v_h__3_5963_);
lean_dec_ref(v_op_5960_);
v___x_5974_ = lean_box(0);
v___x_5975_ = lean_apply_1(v_h__2_5962_, v___x_5974_);
return v___x_5975_;
}
}
else
{
lean_object* v___x_5976_; lean_object* v___x_5977_; 
lean_dec(v_h__4_5964_);
lean_dec(v_h__3_5963_);
lean_dec(v_h__2_5962_);
lean_dec_ref(v_op_5960_);
v___x_5976_ = lean_box(0);
v___x_5977_ = lean_apply_1(v_h__1_5961_, v___x_5976_);
return v___x_5977_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter(lean_object* v_motive_5978_, lean_object* v_op_5979_, lean_object* v_h__1_5980_, lean_object* v_h__2_5981_, lean_object* v_h__3_5982_, lean_object* v_h__4_5983_){
_start:
{
lean_object* v___x_5984_; uint8_t v___x_5985_; 
v___x_5984_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter___redArg___closed__0));
v___x_5985_ = lean_string_dec_eq(v_op_5979_, v___x_5984_);
if (v___x_5985_ == 0)
{
lean_object* v___x_5986_; uint8_t v___x_5987_; 
lean_dec(v_h__1_5980_);
v___x_5986_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter___redArg___closed__1));
v___x_5987_ = lean_string_dec_eq(v_op_5979_, v___x_5986_);
if (v___x_5987_ == 0)
{
lean_object* v___x_5988_; uint8_t v___x_5989_; 
lean_dec(v_h__2_5981_);
v___x_5988_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__7_splitter___redArg___closed__2));
v___x_5989_ = lean_string_dec_eq(v_op_5979_, v___x_5988_);
if (v___x_5989_ == 0)
{
lean_object* v___x_5990_; 
lean_dec(v_h__3_5982_);
v___x_5990_ = lean_apply_4(v_h__4_5983_, v_op_5979_, lean_box(0), lean_box(0), lean_box(0));
return v___x_5990_;
}
else
{
lean_object* v___x_5991_; lean_object* v___x_5992_; 
lean_dec(v_h__4_5983_);
lean_dec_ref(v_op_5979_);
v___x_5991_ = lean_box(0);
v___x_5992_ = lean_apply_1(v_h__3_5982_, v___x_5991_);
return v___x_5992_;
}
}
else
{
lean_object* v___x_5993_; lean_object* v___x_5994_; 
lean_dec(v_h__4_5983_);
lean_dec(v_h__3_5982_);
lean_dec_ref(v_op_5979_);
v___x_5993_ = lean_box(0);
v___x_5994_ = lean_apply_1(v_h__2_5981_, v___x_5993_);
return v___x_5994_;
}
}
else
{
lean_object* v___x_5995_; lean_object* v___x_5996_; 
lean_dec(v_h__4_5983_);
lean_dec(v_h__3_5982_);
lean_dec(v_h__2_5981_);
lean_dec_ref(v_op_5979_);
v___x_5995_ = lean_box(0);
v___x_5996_ = lean_apply_1(v_h__1_5980_, v___x_5995_);
return v___x_5996_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__9_splitter___redArg(lean_object* v_rest_5997_, lean_object* v_h__1_5998_, lean_object* v_h__2_5999_){
_start:
{
if (lean_obj_tag(v_rest_5997_) == 1)
{
lean_object* v_rest_6000_; 
v_rest_6000_ = lean_ctor_get(v_rest_5997_, 1);
if (lean_obj_tag(v_rest_6000_) == 1)
{
lean_object* v_rest_6001_; 
v_rest_6001_ = lean_ctor_get(v_rest_6000_, 1);
if (lean_obj_tag(v_rest_6001_) == 1)
{
lean_object* v_rest_6002_; 
v_rest_6002_ = lean_ctor_get(v_rest_6001_, 1);
if (lean_obj_tag(v_rest_6002_) == 0)
{
lean_object* v_value_6003_; lean_object* v_value_6004_; lean_object* v_value_6005_; lean_object* v___x_6006_; 
lean_inc_ref(v_rest_6001_);
lean_inc_ref(v_rest_6000_);
lean_dec(v_h__2_5999_);
v_value_6003_ = lean_ctor_get(v_rest_5997_, 0);
lean_inc(v_value_6003_);
lean_dec_ref_known(v_rest_5997_, 2);
v_value_6004_ = lean_ctor_get(v_rest_6000_, 0);
lean_inc(v_value_6004_);
lean_dec_ref_known(v_rest_6000_, 2);
v_value_6005_ = lean_ctor_get(v_rest_6001_, 0);
lean_inc(v_value_6005_);
lean_dec_ref_known(v_rest_6001_, 2);
v___x_6006_ = lean_apply_3(v_h__1_5998_, v_value_6003_, v_value_6004_, v_value_6005_);
return v___x_6006_;
}
else
{
lean_object* v___x_6007_; 
lean_dec(v_h__1_5998_);
v___x_6007_ = lean_apply_2(v_h__2_5999_, v_rest_5997_, lean_box(0));
return v___x_6007_;
}
}
else
{
lean_object* v___x_6008_; 
lean_dec(v_h__1_5998_);
v___x_6008_ = lean_apply_2(v_h__2_5999_, v_rest_5997_, lean_box(0));
return v___x_6008_;
}
}
else
{
lean_object* v___x_6009_; 
lean_dec(v_h__1_5998_);
v___x_6009_ = lean_apply_2(v_h__2_5999_, v_rest_5997_, lean_box(0));
return v___x_6009_;
}
}
else
{
lean_object* v___x_6010_; 
lean_dec(v_h__1_5998_);
v___x_6010_ = lean_apply_2(v_h__2_5999_, v_rest_5997_, lean_box(0));
return v___x_6010_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__9_splitter(lean_object* v_motive_6011_, lean_object* v_rest_6012_, lean_object* v_h__1_6013_, lean_object* v_h__2_6014_){
_start:
{
if (lean_obj_tag(v_rest_6012_) == 1)
{
lean_object* v_rest_6015_; 
v_rest_6015_ = lean_ctor_get(v_rest_6012_, 1);
if (lean_obj_tag(v_rest_6015_) == 1)
{
lean_object* v_rest_6016_; 
v_rest_6016_ = lean_ctor_get(v_rest_6015_, 1);
if (lean_obj_tag(v_rest_6016_) == 1)
{
lean_object* v_rest_6017_; 
v_rest_6017_ = lean_ctor_get(v_rest_6016_, 1);
if (lean_obj_tag(v_rest_6017_) == 0)
{
lean_object* v_value_6018_; lean_object* v_value_6019_; lean_object* v_value_6020_; lean_object* v___x_6021_; 
lean_inc_ref(v_rest_6016_);
lean_inc_ref(v_rest_6015_);
lean_dec(v_h__2_6014_);
v_value_6018_ = lean_ctor_get(v_rest_6012_, 0);
lean_inc(v_value_6018_);
lean_dec_ref_known(v_rest_6012_, 2);
v_value_6019_ = lean_ctor_get(v_rest_6015_, 0);
lean_inc(v_value_6019_);
lean_dec_ref_known(v_rest_6015_, 2);
v_value_6020_ = lean_ctor_get(v_rest_6016_, 0);
lean_inc(v_value_6020_);
lean_dec_ref_known(v_rest_6016_, 2);
v___x_6021_ = lean_apply_3(v_h__1_6013_, v_value_6018_, v_value_6019_, v_value_6020_);
return v___x_6021_;
}
else
{
lean_object* v___x_6022_; 
lean_dec(v_h__1_6013_);
v___x_6022_ = lean_apply_2(v_h__2_6014_, v_rest_6012_, lean_box(0));
return v___x_6022_;
}
}
else
{
lean_object* v___x_6023_; 
lean_dec(v_h__1_6013_);
v___x_6023_ = lean_apply_2(v_h__2_6014_, v_rest_6012_, lean_box(0));
return v___x_6023_;
}
}
else
{
lean_object* v___x_6024_; 
lean_dec(v_h__1_6013_);
v___x_6024_ = lean_apply_2(v_h__2_6014_, v_rest_6012_, lean_box(0));
return v___x_6024_;
}
}
else
{
lean_object* v___x_6025_; 
lean_dec(v_h__1_6013_);
v___x_6025_ = lean_apply_2(v_h__2_6014_, v_rest_6012_, lean_box(0));
return v___x_6025_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__18_splitter___redArg(lean_object* v_r_6026_, lean_object* v_h__1_6027_, lean_object* v_h__2_6028_){
_start:
{
if (lean_obj_tag(v_r_6026_) == 4)
{
lean_object* v_values_6029_; 
v_values_6029_ = lean_ctor_get(v_r_6026_, 0);
if (lean_obj_tag(v_values_6029_) == 1)
{
lean_object* v_rest_6030_; 
v_rest_6030_ = lean_ctor_get(v_values_6029_, 1);
if (lean_obj_tag(v_rest_6030_) == 1)
{
lean_object* v_rest_6031_; 
v_rest_6031_ = lean_ctor_get(v_rest_6030_, 1);
if (lean_obj_tag(v_rest_6031_) == 0)
{
lean_object* v_value_6032_; lean_object* v_value_6033_; lean_object* v___x_6034_; 
lean_inc_ref(v_rest_6030_);
lean_inc_ref(v_values_6029_);
lean_dec_ref_known(v_r_6026_, 1);
lean_dec(v_h__2_6028_);
v_value_6032_ = lean_ctor_get(v_values_6029_, 0);
lean_inc(v_value_6032_);
lean_dec_ref_known(v_values_6029_, 2);
v_value_6033_ = lean_ctor_get(v_rest_6030_, 0);
lean_inc(v_value_6033_);
lean_dec_ref_known(v_rest_6030_, 2);
v___x_6034_ = lean_apply_2(v_h__1_6027_, v_value_6032_, v_value_6033_);
return v___x_6034_;
}
else
{
lean_object* v___x_6035_; 
lean_dec(v_h__1_6027_);
v___x_6035_ = lean_apply_2(v_h__2_6028_, v_r_6026_, lean_box(0));
return v___x_6035_;
}
}
else
{
lean_object* v___x_6036_; 
lean_dec(v_h__1_6027_);
v___x_6036_ = lean_apply_2(v_h__2_6028_, v_r_6026_, lean_box(0));
return v___x_6036_;
}
}
else
{
lean_object* v___x_6037_; 
lean_dec(v_h__1_6027_);
v___x_6037_ = lean_apply_2(v_h__2_6028_, v_r_6026_, lean_box(0));
return v___x_6037_;
}
}
else
{
lean_object* v___x_6038_; 
lean_dec(v_h__1_6027_);
v___x_6038_ = lean_apply_2(v_h__2_6028_, v_r_6026_, lean_box(0));
return v___x_6038_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__18_splitter(lean_object* v_motive_6039_, lean_object* v_r_6040_, lean_object* v_h__1_6041_, lean_object* v_h__2_6042_){
_start:
{
if (lean_obj_tag(v_r_6040_) == 4)
{
lean_object* v_values_6043_; 
v_values_6043_ = lean_ctor_get(v_r_6040_, 0);
if (lean_obj_tag(v_values_6043_) == 1)
{
lean_object* v_rest_6044_; 
v_rest_6044_ = lean_ctor_get(v_values_6043_, 1);
if (lean_obj_tag(v_rest_6044_) == 1)
{
lean_object* v_rest_6045_; 
v_rest_6045_ = lean_ctor_get(v_rest_6044_, 1);
if (lean_obj_tag(v_rest_6045_) == 0)
{
lean_object* v_value_6046_; lean_object* v_value_6047_; lean_object* v___x_6048_; 
lean_inc_ref(v_rest_6044_);
lean_inc_ref(v_values_6043_);
lean_dec_ref_known(v_r_6040_, 1);
lean_dec(v_h__2_6042_);
v_value_6046_ = lean_ctor_get(v_values_6043_, 0);
lean_inc(v_value_6046_);
lean_dec_ref_known(v_values_6043_, 2);
v_value_6047_ = lean_ctor_get(v_rest_6044_, 0);
lean_inc(v_value_6047_);
lean_dec_ref_known(v_rest_6044_, 2);
v___x_6048_ = lean_apply_2(v_h__1_6041_, v_value_6046_, v_value_6047_);
return v___x_6048_;
}
else
{
lean_object* v___x_6049_; 
lean_dec(v_h__1_6041_);
v___x_6049_ = lean_apply_2(v_h__2_6042_, v_r_6040_, lean_box(0));
return v___x_6049_;
}
}
else
{
lean_object* v___x_6050_; 
lean_dec(v_h__1_6041_);
v___x_6050_ = lean_apply_2(v_h__2_6042_, v_r_6040_, lean_box(0));
return v___x_6050_;
}
}
else
{
lean_object* v___x_6051_; 
lean_dec(v_h__1_6041_);
v___x_6051_ = lean_apply_2(v_h__2_6042_, v_r_6040_, lean_box(0));
return v___x_6051_;
}
}
else
{
lean_object* v___x_6052_; 
lean_dec(v_h__1_6041_);
v___x_6052_ = lean_apply_2(v_h__2_6042_, v_r_6040_, lean_box(0));
return v___x_6052_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__15_splitter___redArg(lean_object* v_a_6053_, lean_object* v_b_6054_, lean_object* v_h__1_6055_, lean_object* v_h__2_6056_, lean_object* v_h__3_6057_){
_start:
{
switch(lean_obj_tag(v_a_6053_))
{
case 2:
{
lean_dec(v_h__2_6056_);
if (lean_obj_tag(v_b_6054_) == 2)
{
uint64_t v_value_6058_; uint64_t v_value_6059_; lean_object* v___x_6060_; lean_object* v___x_6061_; lean_object* v___x_6062_; 
lean_dec(v_h__3_6057_);
v_value_6058_ = lean_ctor_get_uint64(v_a_6053_, 0);
lean_dec_ref_known(v_a_6053_, 0);
v_value_6059_ = lean_ctor_get_uint64(v_b_6054_, 0);
lean_dec_ref_known(v_b_6054_, 0);
v___x_6060_ = lean_box_uint64(v_value_6058_);
v___x_6061_ = lean_box_uint64(v_value_6059_);
v___x_6062_ = lean_apply_2(v_h__1_6055_, v___x_6060_, v___x_6061_);
return v___x_6062_;
}
else
{
lean_object* v___x_6063_; 
lean_dec(v_h__1_6055_);
v___x_6063_ = lean_apply_4(v_h__3_6057_, v_a_6053_, v_b_6054_, lean_box(0), lean_box(0));
return v___x_6063_;
}
}
case 3:
{
lean_dec(v_h__1_6055_);
if (lean_obj_tag(v_b_6054_) == 3)
{
lean_object* v_value_6064_; lean_object* v_value_6065_; lean_object* v___x_6066_; 
lean_dec(v_h__3_6057_);
v_value_6064_ = lean_ctor_get(v_a_6053_, 0);
lean_inc_ref(v_value_6064_);
lean_dec_ref_known(v_a_6053_, 1);
v_value_6065_ = lean_ctor_get(v_b_6054_, 0);
lean_inc_ref(v_value_6065_);
lean_dec_ref_known(v_b_6054_, 1);
v___x_6066_ = lean_apply_2(v_h__2_6056_, v_value_6064_, v_value_6065_);
return v___x_6066_;
}
else
{
lean_object* v___x_6067_; 
lean_dec(v_h__2_6056_);
v___x_6067_ = lean_apply_4(v_h__3_6057_, v_a_6053_, v_b_6054_, lean_box(0), lean_box(0));
return v___x_6067_;
}
}
default: 
{
lean_object* v___x_6068_; 
lean_dec(v_h__2_6056_);
lean_dec(v_h__1_6055_);
v___x_6068_ = lean_apply_4(v_h__3_6057_, v_a_6053_, v_b_6054_, lean_box(0), lean_box(0));
return v___x_6068_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__15_splitter(lean_object* v_motive_6069_, lean_object* v_a_6070_, lean_object* v_b_6071_, lean_object* v_h__1_6072_, lean_object* v_h__2_6073_, lean_object* v_h__3_6074_){
_start:
{
switch(lean_obj_tag(v_a_6070_))
{
case 2:
{
lean_dec(v_h__2_6073_);
if (lean_obj_tag(v_b_6071_) == 2)
{
uint64_t v_value_6075_; uint64_t v_value_6076_; lean_object* v___x_6077_; lean_object* v___x_6078_; lean_object* v___x_6079_; 
lean_dec(v_h__3_6074_);
v_value_6075_ = lean_ctor_get_uint64(v_a_6070_, 0);
lean_dec_ref_known(v_a_6070_, 0);
v_value_6076_ = lean_ctor_get_uint64(v_b_6071_, 0);
lean_dec_ref_known(v_b_6071_, 0);
v___x_6077_ = lean_box_uint64(v_value_6075_);
v___x_6078_ = lean_box_uint64(v_value_6076_);
v___x_6079_ = lean_apply_2(v_h__1_6072_, v___x_6077_, v___x_6078_);
return v___x_6079_;
}
else
{
lean_object* v___x_6080_; 
lean_dec(v_h__1_6072_);
v___x_6080_ = lean_apply_4(v_h__3_6074_, v_a_6070_, v_b_6071_, lean_box(0), lean_box(0));
return v___x_6080_;
}
}
case 3:
{
lean_dec(v_h__1_6072_);
if (lean_obj_tag(v_b_6071_) == 3)
{
lean_object* v_value_6081_; lean_object* v_value_6082_; lean_object* v___x_6083_; 
lean_dec(v_h__3_6074_);
v_value_6081_ = lean_ctor_get(v_a_6070_, 0);
lean_inc_ref(v_value_6081_);
lean_dec_ref_known(v_a_6070_, 1);
v_value_6082_ = lean_ctor_get(v_b_6071_, 0);
lean_inc_ref(v_value_6082_);
lean_dec_ref_known(v_b_6071_, 1);
v___x_6083_ = lean_apply_2(v_h__2_6073_, v_value_6081_, v_value_6082_);
return v___x_6083_;
}
else
{
lean_object* v___x_6084_; 
lean_dec(v_h__2_6073_);
v___x_6084_ = lean_apply_4(v_h__3_6074_, v_a_6070_, v_b_6071_, lean_box(0), lean_box(0));
return v___x_6084_;
}
}
default: 
{
lean_object* v___x_6085_; 
lean_dec(v_h__2_6073_);
lean_dec(v_h__1_6072_);
v___x_6085_ = lean_apply_4(v_h__3_6074_, v_a_6070_, v_b_6071_, lean_box(0), lean_box(0));
return v___x_6085_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter___redArg(lean_object* v_op_6089_, lean_object* v_h__1_6090_, lean_object* v_h__2_6091_, lean_object* v_h__3_6092_, lean_object* v_h__4_6093_){
_start:
{
lean_object* v___x_6094_; uint8_t v___x_6095_; 
v___x_6094_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter___redArg___closed__0));
v___x_6095_ = lean_string_dec_eq(v_op_6089_, v___x_6094_);
if (v___x_6095_ == 0)
{
lean_object* v___x_6096_; uint8_t v___x_6097_; 
lean_dec(v_h__1_6090_);
v___x_6096_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter___redArg___closed__1));
v___x_6097_ = lean_string_dec_eq(v_op_6089_, v___x_6096_);
if (v___x_6097_ == 0)
{
lean_object* v___x_6098_; uint8_t v___x_6099_; 
lean_dec(v_h__2_6091_);
v___x_6098_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter___redArg___closed__2));
v___x_6099_ = lean_string_dec_eq(v_op_6089_, v___x_6098_);
if (v___x_6099_ == 0)
{
lean_object* v___x_6100_; 
lean_dec(v_h__3_6092_);
v___x_6100_ = lean_apply_4(v_h__4_6093_, v_op_6089_, lean_box(0), lean_box(0), lean_box(0));
return v___x_6100_;
}
else
{
lean_object* v___x_6101_; lean_object* v___x_6102_; 
lean_dec(v_h__4_6093_);
lean_dec_ref(v_op_6089_);
v___x_6101_ = lean_box(0);
v___x_6102_ = lean_apply_1(v_h__3_6092_, v___x_6101_);
return v___x_6102_;
}
}
else
{
lean_object* v___x_6103_; lean_object* v___x_6104_; 
lean_dec(v_h__4_6093_);
lean_dec(v_h__3_6092_);
lean_dec_ref(v_op_6089_);
v___x_6103_ = lean_box(0);
v___x_6104_ = lean_apply_1(v_h__2_6091_, v___x_6103_);
return v___x_6104_;
}
}
else
{
lean_object* v___x_6105_; lean_object* v___x_6106_; 
lean_dec(v_h__4_6093_);
lean_dec(v_h__3_6092_);
lean_dec(v_h__2_6091_);
lean_dec_ref(v_op_6089_);
v___x_6105_ = lean_box(0);
v___x_6106_ = lean_apply_1(v_h__1_6090_, v___x_6105_);
return v___x_6106_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter(lean_object* v_motive_6107_, lean_object* v_op_6108_, lean_object* v_h__1_6109_, lean_object* v_h__2_6110_, lean_object* v_h__3_6111_, lean_object* v_h__4_6112_){
_start:
{
lean_object* v___x_6113_; uint8_t v___x_6114_; 
v___x_6113_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter___redArg___closed__0));
v___x_6114_ = lean_string_dec_eq(v_op_6108_, v___x_6113_);
if (v___x_6114_ == 0)
{
lean_object* v___x_6115_; uint8_t v___x_6116_; 
lean_dec(v_h__1_6109_);
v___x_6115_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter___redArg___closed__1));
v___x_6116_ = lean_string_dec_eq(v_op_6108_, v___x_6115_);
if (v___x_6116_ == 0)
{
lean_object* v___x_6117_; uint8_t v___x_6118_; 
lean_dec(v_h__2_6110_);
v___x_6117_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__11_splitter___redArg___closed__2));
v___x_6118_ = lean_string_dec_eq(v_op_6108_, v___x_6117_);
if (v___x_6118_ == 0)
{
lean_object* v___x_6119_; 
lean_dec(v_h__3_6111_);
v___x_6119_ = lean_apply_4(v_h__4_6112_, v_op_6108_, lean_box(0), lean_box(0), lean_box(0));
return v___x_6119_;
}
else
{
lean_object* v___x_6120_; lean_object* v___x_6121_; 
lean_dec(v_h__4_6112_);
lean_dec_ref(v_op_6108_);
v___x_6120_ = lean_box(0);
v___x_6121_ = lean_apply_1(v_h__3_6111_, v___x_6120_);
return v___x_6121_;
}
}
else
{
lean_object* v___x_6122_; lean_object* v___x_6123_; 
lean_dec(v_h__4_6112_);
lean_dec(v_h__3_6111_);
lean_dec_ref(v_op_6108_);
v___x_6122_ = lean_box(0);
v___x_6123_ = lean_apply_1(v_h__2_6110_, v___x_6122_);
return v___x_6123_;
}
}
else
{
lean_object* v___x_6124_; lean_object* v___x_6125_; 
lean_dec(v_h__4_6112_);
lean_dec(v_h__3_6111_);
lean_dec(v_h__2_6110_);
lean_dec_ref(v_op_6108_);
v___x_6124_ = lean_box(0);
v___x_6125_ = lean_apply_1(v_h__1_6109_, v___x_6124_);
return v___x_6125_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__13_splitter___redArg(uint8_t v_x_6126_, lean_object* v_h__1_6127_, lean_object* v_h__2_6128_, lean_object* v_h__3_6129_){
_start:
{
switch(v_x_6126_)
{
case 0:
{
lean_object* v___x_6130_; lean_object* v___x_6131_; 
lean_dec(v_h__3_6129_);
lean_dec(v_h__2_6128_);
v___x_6130_ = lean_box(0);
v___x_6131_ = lean_apply_1(v_h__1_6127_, v___x_6130_);
return v___x_6131_;
}
case 1:
{
lean_object* v___x_6132_; lean_object* v___x_6133_; 
lean_dec(v_h__3_6129_);
lean_dec(v_h__1_6127_);
v___x_6132_ = lean_box(0);
v___x_6133_ = lean_apply_1(v_h__2_6128_, v___x_6132_);
return v___x_6133_;
}
default: 
{
lean_object* v___x_6134_; lean_object* v___x_6135_; 
lean_dec(v_h__2_6128_);
lean_dec(v_h__1_6127_);
v___x_6134_ = lean_box(0);
v___x_6135_ = lean_apply_1(v_h__3_6129_, v___x_6134_);
return v___x_6135_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__13_splitter___redArg___boxed(lean_object* v_x_6136_, lean_object* v_h__1_6137_, lean_object* v_h__2_6138_, lean_object* v_h__3_6139_){
_start:
{
uint8_t v_x_33__boxed_6140_; lean_object* v_res_6141_; 
v_x_33__boxed_6140_ = lean_unbox(v_x_6136_);
v_res_6141_ = lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__13_splitter___redArg(v_x_33__boxed_6140_, v_h__1_6137_, v_h__2_6138_, v_h__3_6139_);
return v_res_6141_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__13_splitter(lean_object* v_motive_6142_, uint8_t v_x_6143_, lean_object* v_h__1_6144_, lean_object* v_h__2_6145_, lean_object* v_h__3_6146_){
_start:
{
switch(v_x_6143_)
{
case 0:
{
lean_object* v___x_6147_; lean_object* v___x_6148_; 
lean_dec(v_h__3_6146_);
lean_dec(v_h__2_6145_);
v___x_6147_ = lean_box(0);
v___x_6148_ = lean_apply_1(v_h__1_6144_, v___x_6147_);
return v___x_6148_;
}
case 1:
{
lean_object* v___x_6149_; lean_object* v___x_6150_; 
lean_dec(v_h__3_6146_);
lean_dec(v_h__1_6144_);
v___x_6149_ = lean_box(0);
v___x_6150_ = lean_apply_1(v_h__2_6145_, v___x_6149_);
return v___x_6150_;
}
default: 
{
lean_object* v___x_6151_; lean_object* v___x_6152_; 
lean_dec(v_h__2_6145_);
lean_dec(v_h__1_6144_);
v___x_6151_ = lean_box(0);
v___x_6152_ = lean_apply_1(v_h__3_6146_, v___x_6151_);
return v___x_6152_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__13_splitter___boxed(lean_object* v_motive_6153_, lean_object* v_x_6154_, lean_object* v_h__1_6155_, lean_object* v_h__2_6156_, lean_object* v_h__3_6157_){
_start:
{
uint8_t v_x_48__boxed_6158_; lean_object* v_res_6159_; 
v_x_48__boxed_6158_ = lean_unbox(v_x_6154_);
v_res_6159_ = lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__13_splitter(v_motive_6153_, v_x_48__boxed_6158_, v_h__1_6155_, v_h__2_6156_, v_h__3_6157_);
return v_res_6159_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__22_splitter___redArg(lean_object* v_rest_6160_, lean_object* v_h__1_6161_, lean_object* v_h__2_6162_){
_start:
{
if (lean_obj_tag(v_rest_6160_) == 0)
{
lean_object* v___x_6163_; lean_object* v___x_6164_; 
lean_dec(v_h__1_6161_);
v___x_6163_ = lean_box(0);
v___x_6164_ = lean_apply_1(v_h__2_6162_, v___x_6163_);
return v___x_6164_;
}
else
{
lean_object* v_value_6165_; lean_object* v_rest_6166_; lean_object* v___x_6167_; 
lean_dec(v_h__2_6162_);
v_value_6165_ = lean_ctor_get(v_rest_6160_, 0);
lean_inc(v_value_6165_);
v_rest_6166_ = lean_ctor_get(v_rest_6160_, 1);
lean_inc(v_rest_6166_);
lean_dec_ref_known(v_rest_6160_, 2);
v___x_6167_ = lean_apply_2(v_h__1_6161_, v_value_6165_, v_rest_6166_);
return v___x_6167_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__22_splitter(lean_object* v_motive_6168_, lean_object* v_rest_6169_, lean_object* v_h__1_6170_, lean_object* v_h__2_6171_){
_start:
{
if (lean_obj_tag(v_rest_6169_) == 0)
{
lean_object* v___x_6172_; lean_object* v___x_6173_; 
lean_dec(v_h__1_6170_);
v___x_6172_ = lean_box(0);
v___x_6173_ = lean_apply_1(v_h__2_6171_, v___x_6172_);
return v___x_6173_;
}
else
{
lean_object* v_value_6174_; lean_object* v_rest_6175_; lean_object* v___x_6176_; 
lean_dec(v_h__2_6171_);
v_value_6174_ = lean_ctor_get(v_rest_6169_, 0);
lean_inc(v_value_6174_);
v_rest_6175_ = lean_ctor_get(v_rest_6169_, 1);
lean_inc(v_rest_6175_);
lean_dec_ref_known(v_rest_6169_, 2);
v___x_6176_ = lean_apply_2(v_h__1_6170_, v_value_6174_, v_rest_6175_);
return v___x_6176_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_asStr_match__1_splitter___redArg(lean_object* v_x_6177_, lean_object* v_h__1_6178_, lean_object* v_h__2_6179_){
_start:
{
if (lean_obj_tag(v_x_6177_) == 3)
{
lean_object* v_value_6180_; lean_object* v___x_6181_; 
lean_dec(v_h__2_6179_);
v_value_6180_ = lean_ctor_get(v_x_6177_, 0);
lean_inc_ref(v_value_6180_);
lean_dec_ref_known(v_x_6177_, 1);
v___x_6181_ = lean_apply_1(v_h__1_6178_, v_value_6180_);
return v___x_6181_;
}
else
{
lean_object* v___x_6182_; 
lean_dec(v_h__1_6178_);
v___x_6182_ = lean_apply_2(v_h__2_6179_, v_x_6177_, lean_box(0));
return v___x_6182_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_asStr_match__1_splitter(lean_object* v_motive_6183_, lean_object* v_x_6184_, lean_object* v_h__1_6185_, lean_object* v_h__2_6186_){
_start:
{
if (lean_obj_tag(v_x_6184_) == 3)
{
lean_object* v_value_6187_; lean_object* v___x_6188_; 
lean_dec(v_h__2_6186_);
v_value_6187_ = lean_ctor_get(v_x_6184_, 0);
lean_inc_ref(v_value_6187_);
lean_dec_ref_known(v_x_6184_, 1);
v___x_6188_ = lean_apply_1(v_h__1_6185_, v_value_6187_);
return v___x_6188_;
}
else
{
lean_object* v___x_6189_; 
lean_dec(v_h__1_6185_);
v___x_6189_ = lean_apply_2(v_h__2_6186_, v_x_6184_, lean_box(0));
return v___x_6189_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__20_splitter___redArg(lean_object* v_x_6190_, lean_object* v_h__1_6191_, lean_object* v_h__2_6192_){
_start:
{
if (lean_obj_tag(v_x_6190_) == 0)
{
lean_object* v___x_6193_; lean_object* v___x_6194_; 
lean_dec(v_h__2_6192_);
v___x_6193_ = lean_box(0);
v___x_6194_ = lean_apply_1(v_h__1_6191_, v___x_6193_);
return v___x_6194_;
}
else
{
lean_object* v_val_6195_; lean_object* v___x_6196_; 
lean_dec(v_h__1_6191_);
v_val_6195_ = lean_ctor_get(v_x_6190_, 0);
lean_inc(v_val_6195_);
lean_dec_ref_known(v_x_6190_, 1);
v___x_6196_ = lean_apply_1(v_h__2_6192_, v_val_6195_);
return v___x_6196_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__20_splitter(lean_object* v_motive_6197_, lean_object* v_x_6198_, lean_object* v_h__1_6199_, lean_object* v_h__2_6200_){
_start:
{
if (lean_obj_tag(v_x_6198_) == 0)
{
lean_object* v___x_6201_; lean_object* v___x_6202_; 
lean_dec(v_h__2_6200_);
v___x_6201_ = lean_box(0);
v___x_6202_ = lean_apply_1(v_h__1_6199_, v___x_6201_);
return v___x_6202_;
}
else
{
lean_object* v_val_6203_; lean_object* v___x_6204_; 
lean_dec(v_h__1_6199_);
v_val_6203_ = lean_ctor_get(v_x_6198_, 0);
lean_inc(v_val_6203_);
lean_dec_ref_known(v_x_6198_, 1);
v___x_6204_ = lean_apply_1(v_h__2_6200_, v_val_6203_);
return v___x_6204_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__24_splitter___redArg(lean_object* v_rest_6205_, lean_object* v_h__1_6206_, lean_object* v_h__2_6207_){
_start:
{
if (lean_obj_tag(v_rest_6205_) == 1)
{
lean_object* v_rest_6208_; 
v_rest_6208_ = lean_ctor_get(v_rest_6205_, 1);
if (lean_obj_tag(v_rest_6208_) == 1)
{
lean_object* v_rest_6209_; 
v_rest_6209_ = lean_ctor_get(v_rest_6208_, 1);
if (lean_obj_tag(v_rest_6209_) == 1)
{
lean_object* v_rest_6210_; 
v_rest_6210_ = lean_ctor_get(v_rest_6209_, 1);
if (lean_obj_tag(v_rest_6210_) == 1)
{
lean_object* v_rest_6211_; 
v_rest_6211_ = lean_ctor_get(v_rest_6210_, 1);
if (lean_obj_tag(v_rest_6211_) == 1)
{
lean_object* v_rest_6212_; 
v_rest_6212_ = lean_ctor_get(v_rest_6211_, 1);
if (lean_obj_tag(v_rest_6212_) == 0)
{
lean_object* v_value_6213_; lean_object* v_value_6214_; lean_object* v_value_6215_; lean_object* v_value_6216_; lean_object* v_value_6217_; lean_object* v___x_6218_; 
lean_inc_ref(v_rest_6211_);
lean_inc_ref(v_rest_6210_);
lean_inc_ref(v_rest_6209_);
lean_inc_ref(v_rest_6208_);
lean_dec(v_h__2_6207_);
v_value_6213_ = lean_ctor_get(v_rest_6205_, 0);
lean_inc(v_value_6213_);
lean_dec_ref_known(v_rest_6205_, 2);
v_value_6214_ = lean_ctor_get(v_rest_6208_, 0);
lean_inc(v_value_6214_);
lean_dec_ref_known(v_rest_6208_, 2);
v_value_6215_ = lean_ctor_get(v_rest_6209_, 0);
lean_inc(v_value_6215_);
lean_dec_ref_known(v_rest_6209_, 2);
v_value_6216_ = lean_ctor_get(v_rest_6210_, 0);
lean_inc(v_value_6216_);
lean_dec_ref_known(v_rest_6210_, 2);
v_value_6217_ = lean_ctor_get(v_rest_6211_, 0);
lean_inc(v_value_6217_);
lean_dec_ref_known(v_rest_6211_, 2);
v___x_6218_ = lean_apply_5(v_h__1_6206_, v_value_6213_, v_value_6214_, v_value_6215_, v_value_6216_, v_value_6217_);
return v___x_6218_;
}
else
{
lean_object* v___x_6219_; 
lean_dec(v_h__1_6206_);
v___x_6219_ = lean_apply_2(v_h__2_6207_, v_rest_6205_, lean_box(0));
return v___x_6219_;
}
}
else
{
lean_object* v___x_6220_; 
lean_dec(v_h__1_6206_);
v___x_6220_ = lean_apply_2(v_h__2_6207_, v_rest_6205_, lean_box(0));
return v___x_6220_;
}
}
else
{
lean_object* v___x_6221_; 
lean_dec(v_h__1_6206_);
v___x_6221_ = lean_apply_2(v_h__2_6207_, v_rest_6205_, lean_box(0));
return v___x_6221_;
}
}
else
{
lean_object* v___x_6222_; 
lean_dec(v_h__1_6206_);
v___x_6222_ = lean_apply_2(v_h__2_6207_, v_rest_6205_, lean_box(0));
return v___x_6222_;
}
}
else
{
lean_object* v___x_6223_; 
lean_dec(v_h__1_6206_);
v___x_6223_ = lean_apply_2(v_h__2_6207_, v_rest_6205_, lean_box(0));
return v___x_6223_;
}
}
else
{
lean_object* v___x_6224_; 
lean_dec(v_h__1_6206_);
v___x_6224_ = lean_apply_2(v_h__2_6207_, v_rest_6205_, lean_box(0));
return v___x_6224_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__24_splitter(lean_object* v_motive_6225_, lean_object* v_rest_6226_, lean_object* v_h__1_6227_, lean_object* v_h__2_6228_){
_start:
{
if (lean_obj_tag(v_rest_6226_) == 1)
{
lean_object* v_rest_6229_; 
v_rest_6229_ = lean_ctor_get(v_rest_6226_, 1);
if (lean_obj_tag(v_rest_6229_) == 1)
{
lean_object* v_rest_6230_; 
v_rest_6230_ = lean_ctor_get(v_rest_6229_, 1);
if (lean_obj_tag(v_rest_6230_) == 1)
{
lean_object* v_rest_6231_; 
v_rest_6231_ = lean_ctor_get(v_rest_6230_, 1);
if (lean_obj_tag(v_rest_6231_) == 1)
{
lean_object* v_rest_6232_; 
v_rest_6232_ = lean_ctor_get(v_rest_6231_, 1);
if (lean_obj_tag(v_rest_6232_) == 1)
{
lean_object* v_rest_6233_; 
v_rest_6233_ = lean_ctor_get(v_rest_6232_, 1);
if (lean_obj_tag(v_rest_6233_) == 0)
{
lean_object* v_value_6234_; lean_object* v_value_6235_; lean_object* v_value_6236_; lean_object* v_value_6237_; lean_object* v_value_6238_; lean_object* v___x_6239_; 
lean_inc_ref(v_rest_6232_);
lean_inc_ref(v_rest_6231_);
lean_inc_ref(v_rest_6230_);
lean_inc_ref(v_rest_6229_);
lean_dec(v_h__2_6228_);
v_value_6234_ = lean_ctor_get(v_rest_6226_, 0);
lean_inc(v_value_6234_);
lean_dec_ref_known(v_rest_6226_, 2);
v_value_6235_ = lean_ctor_get(v_rest_6229_, 0);
lean_inc(v_value_6235_);
lean_dec_ref_known(v_rest_6229_, 2);
v_value_6236_ = lean_ctor_get(v_rest_6230_, 0);
lean_inc(v_value_6236_);
lean_dec_ref_known(v_rest_6230_, 2);
v_value_6237_ = lean_ctor_get(v_rest_6231_, 0);
lean_inc(v_value_6237_);
lean_dec_ref_known(v_rest_6231_, 2);
v_value_6238_ = lean_ctor_get(v_rest_6232_, 0);
lean_inc(v_value_6238_);
lean_dec_ref_known(v_rest_6232_, 2);
v___x_6239_ = lean_apply_5(v_h__1_6227_, v_value_6234_, v_value_6235_, v_value_6236_, v_value_6237_, v_value_6238_);
return v___x_6239_;
}
else
{
lean_object* v___x_6240_; 
lean_dec(v_h__1_6227_);
v___x_6240_ = lean_apply_2(v_h__2_6228_, v_rest_6226_, lean_box(0));
return v___x_6240_;
}
}
else
{
lean_object* v___x_6241_; 
lean_dec(v_h__1_6227_);
v___x_6241_ = lean_apply_2(v_h__2_6228_, v_rest_6226_, lean_box(0));
return v___x_6241_;
}
}
else
{
lean_object* v___x_6242_; 
lean_dec(v_h__1_6227_);
v___x_6242_ = lean_apply_2(v_h__2_6228_, v_rest_6226_, lean_box(0));
return v___x_6242_;
}
}
else
{
lean_object* v___x_6243_; 
lean_dec(v_h__1_6227_);
v___x_6243_ = lean_apply_2(v_h__2_6228_, v_rest_6226_, lean_box(0));
return v___x_6243_;
}
}
else
{
lean_object* v___x_6244_; 
lean_dec(v_h__1_6227_);
v___x_6244_ = lean_apply_2(v_h__2_6228_, v_rest_6226_, lean_box(0));
return v___x_6244_;
}
}
else
{
lean_object* v___x_6245_; 
lean_dec(v_h__1_6227_);
v___x_6245_ = lean_apply_2(v_h__2_6228_, v_rest_6226_, lean_box(0));
return v___x_6245_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_containsLoop_match__1_splitter___redArg(lean_object* v_x_6246_, lean_object* v_h__1_6247_){
_start:
{
lean_object* v_fst_6248_; lean_object* v_snd_6249_; lean_object* v___x_6250_; 
v_fst_6248_ = lean_ctor_get(v_x_6246_, 0);
lean_inc(v_fst_6248_);
v_snd_6249_ = lean_ctor_get(v_x_6246_, 1);
lean_inc(v_snd_6249_);
lean_dec_ref(v_x_6246_);
v___x_6250_ = lean_apply_2(v_h__1_6247_, v_fst_6248_, v_snd_6249_);
return v___x_6250_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_containsLoop_match__1_splitter(lean_object* v_motive_6251_, lean_object* v_x_6252_, lean_object* v_h__1_6253_){
_start:
{
lean_object* v_fst_6254_; lean_object* v_snd_6255_; lean_object* v___x_6256_; 
v_fst_6254_ = lean_ctor_get(v_x_6252_, 0);
lean_inc(v_fst_6254_);
v_snd_6255_ = lean_ctor_get(v_x_6252_, 1);
lean_inc(v_snd_6255_);
lean_dec_ref(v_x_6252_);
v___x_6256_ = lean_apply_2(v_h__1_6253_, v_fst_6254_, v_snd_6255_);
return v___x_6256_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_uniqueLoop_match__1_splitter___redArg(lean_object* v_x_6257_, lean_object* v_h__1_6258_){
_start:
{
lean_object* v_fst_6259_; lean_object* v_snd_6260_; lean_object* v___x_6261_; 
v_fst_6259_ = lean_ctor_get(v_x_6257_, 0);
lean_inc(v_fst_6259_);
v_snd_6260_ = lean_ctor_get(v_x_6257_, 1);
lean_inc(v_snd_6260_);
lean_dec_ref(v_x_6257_);
v___x_6261_ = lean_apply_2(v_h__1_6258_, v_fst_6259_, v_snd_6260_);
return v___x_6261_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_uniqueLoop_match__1_splitter(lean_object* v_motive_6262_, lean_object* v_x_6263_, lean_object* v_h__1_6264_){
_start:
{
lean_object* v_fst_6265_; lean_object* v_snd_6266_; lean_object* v___x_6267_; 
v_fst_6265_ = lean_ctor_get(v_x_6263_, 0);
lean_inc(v_fst_6265_);
v_snd_6266_ = lean_ctor_get(v_x_6263_, 1);
lean_inc(v_snd_6266_);
lean_dec_ref(v_x_6263_);
v___x_6267_ = lean_apply_2(v_h__1_6264_, v_fst_6265_, v_snd_6266_);
return v___x_6267_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__26_splitter___redArg(lean_object* v_op_6270_, lean_object* v_h__1_6271_, lean_object* v_h__2_6272_, lean_object* v_h__3_6273_){
_start:
{
lean_object* v___x_6274_; uint8_t v___x_6275_; 
v___x_6274_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__26_splitter___redArg___closed__0));
v___x_6275_ = lean_string_dec_eq(v_op_6270_, v___x_6274_);
if (v___x_6275_ == 0)
{
lean_object* v___x_6276_; uint8_t v___x_6277_; 
lean_dec(v_h__1_6271_);
v___x_6276_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__26_splitter___redArg___closed__1));
v___x_6277_ = lean_string_dec_eq(v_op_6270_, v___x_6276_);
if (v___x_6277_ == 0)
{
lean_object* v___x_6278_; 
lean_dec(v_h__2_6272_);
v___x_6278_ = lean_apply_3(v_h__3_6273_, v_op_6270_, lean_box(0), lean_box(0));
return v___x_6278_;
}
else
{
lean_object* v___x_6279_; lean_object* v___x_6280_; 
lean_dec(v_h__3_6273_);
lean_dec_ref(v_op_6270_);
v___x_6279_ = lean_box(0);
v___x_6280_ = lean_apply_1(v_h__2_6272_, v___x_6279_);
return v___x_6280_;
}
}
else
{
lean_object* v___x_6281_; lean_object* v___x_6282_; 
lean_dec(v_h__3_6273_);
lean_dec(v_h__2_6272_);
lean_dec_ref(v_op_6270_);
v___x_6281_ = lean_box(0);
v___x_6282_ = lean_apply_1(v_h__1_6271_, v___x_6281_);
return v___x_6282_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__26_splitter(lean_object* v_motive_6283_, lean_object* v_op_6284_, lean_object* v_h__1_6285_, lean_object* v_h__2_6286_, lean_object* v_h__3_6287_){
_start:
{
lean_object* v___x_6288_; uint8_t v___x_6289_; 
v___x_6288_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__26_splitter___redArg___closed__0));
v___x_6289_ = lean_string_dec_eq(v_op_6284_, v___x_6288_);
if (v___x_6289_ == 0)
{
lean_object* v___x_6290_; uint8_t v___x_6291_; 
lean_dec(v_h__1_6285_);
v___x_6290_ = ((lean_object*)(lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__26_splitter___redArg___closed__1));
v___x_6291_ = lean_string_dec_eq(v_op_6284_, v___x_6290_);
if (v___x_6291_ == 0)
{
lean_object* v___x_6292_; 
lean_dec(v_h__2_6286_);
v___x_6292_ = lean_apply_3(v_h__3_6287_, v_op_6284_, lean_box(0), lean_box(0));
return v___x_6292_;
}
else
{
lean_object* v___x_6293_; lean_object* v___x_6294_; 
lean_dec(v_h__3_6287_);
lean_dec_ref(v_op_6284_);
v___x_6293_ = lean_box(0);
v___x_6294_ = lean_apply_1(v_h__2_6286_, v___x_6293_);
return v___x_6294_;
}
}
else
{
lean_object* v___x_6295_; lean_object* v___x_6296_; 
lean_dec(v_h__3_6287_);
lean_dec(v_h__2_6286_);
lean_dec_ref(v_op_6284_);
v___x_6295_ = lean_box(0);
v___x_6296_ = lean_apply_1(v_h__1_6285_, v___x_6295_);
return v___x_6296_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_mergeLoop_match__1_splitter___redArg(lean_object* v_x_6297_, lean_object* v_h__1_6298_){
_start:
{
lean_object* v_fst_6299_; lean_object* v_snd_6300_; lean_object* v___x_6301_; 
v_fst_6299_ = lean_ctor_get(v_x_6297_, 0);
lean_inc(v_fst_6299_);
v_snd_6300_ = lean_ctor_get(v_x_6297_, 1);
lean_inc(v_snd_6300_);
lean_dec_ref(v_x_6297_);
v___x_6301_ = lean_apply_2(v_h__1_6298_, v_fst_6299_, v_snd_6300_);
return v___x_6301_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_mergeLoop_match__1_splitter(lean_object* v_motive_6302_, lean_object* v_x_6303_, lean_object* v_h__1_6304_){
_start:
{
lean_object* v_fst_6305_; lean_object* v_snd_6306_; lean_object* v___x_6307_; 
v_fst_6305_ = lean_ctor_get(v_x_6303_, 0);
lean_inc(v_fst_6305_);
v_snd_6306_ = lean_ctor_get(v_x_6303_, 1);
lean_inc(v_snd_6306_);
lean_dec_ref(v_x_6303_);
v___x_6307_ = lean_apply_2(v_h__1_6304_, v_fst_6305_, v_snd_6306_);
return v___x_6307_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__28_splitter___redArg(lean_object* v_res_6308_, lean_object* v_h__1_6309_, lean_object* v_h__2_6310_){
_start:
{
if (lean_obj_tag(v_res_6308_) == 0)
{
lean_object* v_a_6311_; lean_object* v___x_6312_; 
lean_dec(v_h__1_6309_);
v_a_6311_ = lean_ctor_get(v_res_6308_, 0);
lean_inc(v_a_6311_);
lean_dec_ref_known(v_res_6308_, 1);
v___x_6312_ = lean_apply_1(v_h__2_6310_, v_a_6311_);
return v___x_6312_;
}
else
{
lean_object* v_a_6313_; lean_object* v___x_6314_; 
lean_dec(v_h__2_6310_);
v_a_6313_ = lean_ctor_get(v_res_6308_, 0);
lean_inc(v_a_6313_);
lean_dec_ref_known(v_res_6308_, 1);
v___x_6314_ = lean_apply_1(v_h__1_6309_, v_a_6313_);
return v___x_6314_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__28_splitter(lean_object* v_motive_6315_, lean_object* v_res_6316_, lean_object* v_h__1_6317_, lean_object* v_h__2_6318_){
_start:
{
if (lean_obj_tag(v_res_6316_) == 0)
{
lean_object* v_a_6319_; lean_object* v___x_6320_; 
lean_dec(v_h__1_6317_);
v_a_6319_ = lean_ctor_get(v_res_6316_, 0);
lean_inc(v_a_6319_);
lean_dec_ref_known(v_res_6316_, 1);
v___x_6320_ = lean_apply_1(v_h__2_6318_, v_a_6319_);
return v___x_6320_;
}
else
{
lean_object* v_a_6321_; lean_object* v___x_6322_; 
lean_dec(v_h__2_6318_);
v_a_6321_ = lean_ctor_get(v_res_6316_, 0);
lean_inc(v_a_6321_);
lean_dec_ref_known(v_res_6316_, 1);
v___x_6322_ = lean_apply_1(v_h__1_6317_, v_a_6321_);
return v___x_6322_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__30_splitter___redArg(lean_object* v_v_6323_, lean_object* v_h__1_6324_, lean_object* v_h__2_6325_, lean_object* v_h__3_6326_, lean_object* v_h__4_6327_, lean_object* v_h__5_6328_, lean_object* v_h__6_6329_){
_start:
{
switch(lean_obj_tag(v_v_6323_))
{
case 0:
{
lean_object* v___x_6330_; lean_object* v___x_6331_; 
lean_dec(v_h__5_6328_);
lean_dec(v_h__4_6327_);
lean_dec(v_h__3_6326_);
lean_dec(v_h__2_6325_);
lean_dec(v_h__1_6324_);
v___x_6330_ = lean_box(0);
v___x_6331_ = lean_apply_1(v_h__6_6329_, v___x_6330_);
return v___x_6331_;
}
case 1:
{
uint8_t v_value_6332_; lean_object* v___x_6333_; lean_object* v___x_6334_; 
lean_dec(v_h__6_6329_);
lean_dec(v_h__5_6328_);
lean_dec(v_h__4_6327_);
lean_dec(v_h__2_6325_);
lean_dec(v_h__1_6324_);
v_value_6332_ = lean_ctor_get_uint8(v_v_6323_, 0);
lean_dec_ref_known(v_v_6323_, 0);
v___x_6333_ = lean_box(v_value_6332_);
v___x_6334_ = lean_apply_1(v_h__3_6326_, v___x_6333_);
return v___x_6334_;
}
case 2:
{
uint64_t v_value_6335_; lean_object* v___x_6336_; lean_object* v___x_6337_; 
lean_dec(v_h__6_6329_);
lean_dec(v_h__5_6328_);
lean_dec(v_h__4_6327_);
lean_dec(v_h__3_6326_);
lean_dec(v_h__1_6324_);
v_value_6335_ = lean_ctor_get_uint64(v_v_6323_, 0);
lean_dec_ref_known(v_v_6323_, 0);
v___x_6336_ = lean_box_uint64(v_value_6335_);
v___x_6337_ = lean_apply_1(v_h__2_6325_, v___x_6336_);
return v___x_6337_;
}
case 3:
{
lean_object* v_value_6338_; lean_object* v___x_6339_; 
lean_dec(v_h__6_6329_);
lean_dec(v_h__5_6328_);
lean_dec(v_h__4_6327_);
lean_dec(v_h__3_6326_);
lean_dec(v_h__2_6325_);
v_value_6338_ = lean_ctor_get(v_v_6323_, 0);
lean_inc_ref(v_value_6338_);
lean_dec_ref_known(v_v_6323_, 1);
v___x_6339_ = lean_apply_1(v_h__1_6324_, v_value_6338_);
return v___x_6339_;
}
case 4:
{
lean_object* v_values_6340_; lean_object* v___x_6341_; 
lean_dec(v_h__6_6329_);
lean_dec(v_h__5_6328_);
lean_dec(v_h__3_6326_);
lean_dec(v_h__2_6325_);
lean_dec(v_h__1_6324_);
v_values_6340_ = lean_ctor_get(v_v_6323_, 0);
lean_inc(v_values_6340_);
lean_dec_ref_known(v_v_6323_, 1);
v___x_6341_ = lean_apply_1(v_h__4_6327_, v_values_6340_);
return v___x_6341_;
}
default: 
{
lean_object* v_fields_6342_; lean_object* v___x_6343_; 
lean_dec(v_h__6_6329_);
lean_dec(v_h__4_6327_);
lean_dec(v_h__3_6326_);
lean_dec(v_h__2_6325_);
lean_dec(v_h__1_6324_);
v_fields_6342_ = lean_ctor_get(v_v_6323_, 0);
lean_inc(v_fields_6342_);
lean_dec_ref_known(v_v_6323_, 1);
v___x_6343_ = lean_apply_1(v_h__5_6328_, v_fields_6342_);
return v___x_6343_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__30_splitter(lean_object* v_motive_6344_, lean_object* v_v_6345_, lean_object* v_h__1_6346_, lean_object* v_h__2_6347_, lean_object* v_h__3_6348_, lean_object* v_h__4_6349_, lean_object* v_h__5_6350_, lean_object* v_h__6_6351_){
_start:
{
switch(lean_obj_tag(v_v_6345_))
{
case 0:
{
lean_object* v___x_6352_; lean_object* v___x_6353_; 
lean_dec(v_h__5_6350_);
lean_dec(v_h__4_6349_);
lean_dec(v_h__3_6348_);
lean_dec(v_h__2_6347_);
lean_dec(v_h__1_6346_);
v___x_6352_ = lean_box(0);
v___x_6353_ = lean_apply_1(v_h__6_6351_, v___x_6352_);
return v___x_6353_;
}
case 1:
{
uint8_t v_value_6354_; lean_object* v___x_6355_; lean_object* v___x_6356_; 
lean_dec(v_h__6_6351_);
lean_dec(v_h__5_6350_);
lean_dec(v_h__4_6349_);
lean_dec(v_h__2_6347_);
lean_dec(v_h__1_6346_);
v_value_6354_ = lean_ctor_get_uint8(v_v_6345_, 0);
lean_dec_ref_known(v_v_6345_, 0);
v___x_6355_ = lean_box(v_value_6354_);
v___x_6356_ = lean_apply_1(v_h__3_6348_, v___x_6355_);
return v___x_6356_;
}
case 2:
{
uint64_t v_value_6357_; lean_object* v___x_6358_; lean_object* v___x_6359_; 
lean_dec(v_h__6_6351_);
lean_dec(v_h__5_6350_);
lean_dec(v_h__4_6349_);
lean_dec(v_h__3_6348_);
lean_dec(v_h__1_6346_);
v_value_6357_ = lean_ctor_get_uint64(v_v_6345_, 0);
lean_dec_ref_known(v_v_6345_, 0);
v___x_6358_ = lean_box_uint64(v_value_6357_);
v___x_6359_ = lean_apply_1(v_h__2_6347_, v___x_6358_);
return v___x_6359_;
}
case 3:
{
lean_object* v_value_6360_; lean_object* v___x_6361_; 
lean_dec(v_h__6_6351_);
lean_dec(v_h__5_6350_);
lean_dec(v_h__4_6349_);
lean_dec(v_h__3_6348_);
lean_dec(v_h__2_6347_);
v_value_6360_ = lean_ctor_get(v_v_6345_, 0);
lean_inc_ref(v_value_6360_);
lean_dec_ref_known(v_v_6345_, 1);
v___x_6361_ = lean_apply_1(v_h__1_6346_, v_value_6360_);
return v___x_6361_;
}
case 4:
{
lean_object* v_values_6362_; lean_object* v___x_6363_; 
lean_dec(v_h__6_6351_);
lean_dec(v_h__5_6350_);
lean_dec(v_h__3_6348_);
lean_dec(v_h__2_6347_);
lean_dec(v_h__1_6346_);
v_values_6362_ = lean_ctor_get(v_v_6345_, 0);
lean_inc(v_values_6362_);
lean_dec_ref_known(v_v_6345_, 1);
v___x_6363_ = lean_apply_1(v_h__4_6349_, v_values_6362_);
return v___x_6363_;
}
default: 
{
lean_object* v_fields_6364_; lean_object* v___x_6365_; 
lean_dec(v_h__6_6351_);
lean_dec(v_h__4_6349_);
lean_dec(v_h__3_6348_);
lean_dec(v_h__2_6347_);
lean_dec(v_h__1_6346_);
v_fields_6364_ = lean_ctor_get(v_v_6345_, 0);
lean_inc(v_fields_6364_);
lean_dec_ref_known(v_v_6345_, 1);
v___x_6365_ = lean_apply_1(v_h__5_6350_, v_fields_6364_);
return v___x_6365_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__34_splitter___redArg(lean_object* v_acc_6366_, lean_object* v_h__1_6367_, lean_object* v_h__2_6368_){
_start:
{
if (lean_obj_tag(v_acc_6366_) == 0)
{
lean_object* v___x_6369_; lean_object* v___x_6370_; 
lean_dec(v_h__2_6368_);
v___x_6369_ = lean_box(0);
v___x_6370_ = lean_apply_1(v_h__1_6367_, v___x_6369_);
return v___x_6370_;
}
else
{
lean_object* v___x_6371_; 
lean_dec(v_h__1_6367_);
v___x_6371_ = lean_apply_2(v_h__2_6368_, v_acc_6366_, lean_box(0));
return v___x_6371_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__34_splitter(lean_object* v_motive_6372_, lean_object* v_acc_6373_, lean_object* v_h__1_6374_, lean_object* v_h__2_6375_){
_start:
{
if (lean_obj_tag(v_acc_6373_) == 0)
{
lean_object* v___x_6376_; lean_object* v___x_6377_; 
lean_dec(v_h__2_6375_);
v___x_6376_ = lean_box(0);
v___x_6377_ = lean_apply_1(v_h__1_6374_, v___x_6376_);
return v___x_6377_;
}
else
{
lean_object* v___x_6378_; 
lean_dec(v_h__1_6374_);
v___x_6378_ = lean_apply_2(v_h__2_6375_, v_acc_6373_, lean_box(0));
return v___x_6378_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__36_splitter___redArg(lean_object* v_acc_6379_, lean_object* v_h__1_6380_, lean_object* v_h__2_6381_){
_start:
{
if (lean_obj_tag(v_acc_6379_) == 0)
{
lean_object* v___x_6382_; lean_object* v___x_6383_; 
lean_dec(v_h__2_6381_);
v___x_6382_ = lean_box(0);
v___x_6383_ = lean_apply_1(v_h__1_6380_, v___x_6382_);
return v___x_6383_;
}
else
{
lean_object* v___x_6384_; 
lean_dec(v_h__1_6380_);
v___x_6384_ = lean_apply_2(v_h__2_6381_, v_acc_6379_, lean_box(0));
return v___x_6384_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__36_splitter(lean_object* v_motive_6385_, lean_object* v_acc_6386_, lean_object* v_h__1_6387_, lean_object* v_h__2_6388_){
_start:
{
if (lean_obj_tag(v_acc_6386_) == 0)
{
lean_object* v___x_6389_; lean_object* v___x_6390_; 
lean_dec(v_h__2_6388_);
v___x_6389_ = lean_box(0);
v___x_6390_ = lean_apply_1(v_h__1_6387_, v___x_6389_);
return v___x_6390_;
}
else
{
lean_object* v___x_6391_; 
lean_dec(v_h__1_6387_);
v___x_6391_ = lean_apply_2(v_h__2_6388_, v_acc_6386_, lean_box(0));
return v___x_6391_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_asBool_match__1_splitter___redArg(lean_object* v_x_6392_, lean_object* v_h__1_6393_, lean_object* v_h__2_6394_){
_start:
{
if (lean_obj_tag(v_x_6392_) == 1)
{
uint8_t v_value_6395_; lean_object* v___x_6396_; lean_object* v___x_6397_; 
lean_dec(v_h__2_6394_);
v_value_6395_ = lean_ctor_get_uint8(v_x_6392_, 0);
lean_dec_ref_known(v_x_6392_, 0);
v___x_6396_ = lean_box(v_value_6395_);
v___x_6397_ = lean_apply_1(v_h__1_6393_, v___x_6396_);
return v___x_6397_;
}
else
{
lean_object* v___x_6398_; 
lean_dec(v_h__1_6393_);
v___x_6398_ = lean_apply_2(v_h__2_6394_, v_x_6392_, lean_box(0));
return v___x_6398_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_asBool_match__1_splitter(lean_object* v_motive_6399_, lean_object* v_x_6400_, lean_object* v_h__1_6401_, lean_object* v_h__2_6402_){
_start:
{
if (lean_obj_tag(v_x_6400_) == 1)
{
uint8_t v_value_6403_; lean_object* v___x_6404_; lean_object* v___x_6405_; 
lean_dec(v_h__2_6402_);
v_value_6403_ = lean_ctor_get_uint8(v_x_6400_, 0);
lean_dec_ref_known(v_x_6400_, 0);
v___x_6404_ = lean_box(v_value_6403_);
v___x_6405_ = lean_apply_1(v_h__1_6401_, v___x_6404_);
return v___x_6405_;
}
else
{
lean_object* v___x_6406_; 
lean_dec(v_h__1_6401_);
v___x_6406_ = lean_apply_2(v_h__2_6402_, v_x_6400_, lean_box(0));
return v___x_6406_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__39_splitter___redArg(lean_object* v_k_6407_, lean_object* v_h__1_6408_, lean_object* v_h__2_6409_, lean_object* v_h__3_6410_){
_start:
{
switch(lean_obj_tag(v_k_6407_))
{
case 3:
{
lean_object* v_value_6411_; lean_object* v___x_6412_; 
lean_dec(v_h__3_6410_);
lean_dec(v_h__2_6409_);
v_value_6411_ = lean_ctor_get(v_k_6407_, 0);
lean_inc_ref(v_value_6411_);
lean_dec_ref_known(v_k_6407_, 1);
v___x_6412_ = lean_apply_1(v_h__1_6408_, v_value_6411_);
return v___x_6412_;
}
case 2:
{
uint64_t v_value_6413_; lean_object* v___x_6414_; lean_object* v___x_6415_; 
lean_dec(v_h__3_6410_);
lean_dec(v_h__1_6408_);
v_value_6413_ = lean_ctor_get_uint64(v_k_6407_, 0);
lean_dec_ref_known(v_k_6407_, 0);
v___x_6414_ = lean_box_uint64(v_value_6413_);
v___x_6415_ = lean_apply_1(v_h__2_6409_, v___x_6414_);
return v___x_6415_;
}
default: 
{
lean_object* v___x_6416_; 
lean_dec(v_h__2_6409_);
lean_dec(v_h__1_6408_);
v___x_6416_ = lean_apply_3(v_h__3_6410_, v_k_6407_, lean_box(0), lean_box(0));
return v___x_6416_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__39_splitter(lean_object* v_motive_6417_, lean_object* v_k_6418_, lean_object* v_h__1_6419_, lean_object* v_h__2_6420_, lean_object* v_h__3_6421_){
_start:
{
switch(lean_obj_tag(v_k_6418_))
{
case 3:
{
lean_object* v_value_6422_; lean_object* v___x_6423_; 
lean_dec(v_h__3_6421_);
lean_dec(v_h__2_6420_);
v_value_6422_ = lean_ctor_get(v_k_6418_, 0);
lean_inc_ref(v_value_6422_);
lean_dec_ref_known(v_k_6418_, 1);
v___x_6423_ = lean_apply_1(v_h__1_6419_, v_value_6422_);
return v___x_6423_;
}
case 2:
{
uint64_t v_value_6424_; lean_object* v___x_6425_; lean_object* v___x_6426_; 
lean_dec(v_h__3_6421_);
lean_dec(v_h__1_6419_);
v_value_6424_ = lean_ctor_get_uint64(v_k_6418_, 0);
lean_dec_ref_known(v_k_6418_, 0);
v___x_6425_ = lean_box_uint64(v_value_6424_);
v___x_6426_ = lean_apply_1(v_h__2_6420_, v___x_6425_);
return v___x_6426_;
}
default: 
{
lean_object* v___x_6427_; 
lean_dec(v_h__2_6420_);
lean_dec(v_h__1_6419_);
v___x_6427_ = lean_apply_3(v_h__3_6421_, v_k_6418_, lean_box(0), lean_box(0));
return v___x_6427_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_asMap_match__1_splitter___redArg(lean_object* v_x_6428_, lean_object* v_h__1_6429_, lean_object* v_h__2_6430_){
_start:
{
if (lean_obj_tag(v_x_6428_) == 5)
{
lean_object* v_fields_6431_; lean_object* v___x_6432_; 
lean_dec(v_h__2_6430_);
v_fields_6431_ = lean_ctor_get(v_x_6428_, 0);
lean_inc(v_fields_6431_);
lean_dec_ref_known(v_x_6428_, 1);
v___x_6432_ = lean_apply_1(v_h__1_6429_, v_fields_6431_);
return v___x_6432_;
}
else
{
lean_object* v___x_6433_; 
lean_dec(v_h__1_6429_);
v___x_6433_ = lean_apply_2(v_h__2_6430_, v_x_6428_, lean_box(0));
return v___x_6433_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_asMap_match__1_splitter(lean_object* v_motive_6434_, lean_object* v_x_6435_, lean_object* v_h__1_6436_, lean_object* v_h__2_6437_){
_start:
{
if (lean_obj_tag(v_x_6435_) == 5)
{
lean_object* v_fields_6438_; lean_object* v___x_6439_; 
lean_dec(v_h__2_6437_);
v_fields_6438_ = lean_ctor_get(v_x_6435_, 0);
lean_inc(v_fields_6438_);
lean_dec_ref_known(v_x_6435_, 1);
v___x_6439_ = lean_apply_1(v_h__1_6436_, v_fields_6438_);
return v___x_6439_;
}
else
{
lean_object* v___x_6440_; 
lean_dec(v_h__1_6436_);
v___x_6440_ = lean_apply_2(v_h__2_6437_, v_x_6435_, lean_box(0));
return v___x_6440_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__42_splitter___redArg(lean_object* v_v_6441_, lean_object* v_h__1_6442_, lean_object* v_h__2_6443_, lean_object* v_h__3_6444_){
_start:
{
if (lean_obj_tag(v_v_6441_) == 1)
{
uint8_t v_value_6445_; 
lean_dec(v_h__3_6444_);
v_value_6445_ = lean_ctor_get_uint8(v_v_6441_, 0);
lean_dec_ref_known(v_v_6441_, 0);
if (v_value_6445_ == 0)
{
lean_object* v___x_6446_; lean_object* v___x_6447_; 
lean_dec(v_h__1_6442_);
v___x_6446_ = lean_box(0);
v___x_6447_ = lean_apply_1(v_h__2_6443_, v___x_6446_);
return v___x_6447_;
}
else
{
lean_object* v___x_6448_; lean_object* v___x_6449_; 
lean_dec(v_h__2_6443_);
v___x_6448_ = lean_box(0);
v___x_6449_ = lean_apply_1(v_h__1_6442_, v___x_6448_);
return v___x_6449_;
}
}
else
{
lean_object* v___x_6450_; 
lean_dec(v_h__2_6443_);
lean_dec(v_h__1_6442_);
v___x_6450_ = lean_apply_3(v_h__3_6444_, v_v_6441_, lean_box(0), lean_box(0));
return v___x_6450_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Eval_0__Algal_Expr_machine_match__42_splitter(lean_object* v_motive_6451_, lean_object* v_v_6452_, lean_object* v_h__1_6453_, lean_object* v_h__2_6454_, lean_object* v_h__3_6455_){
_start:
{
if (lean_obj_tag(v_v_6452_) == 1)
{
uint8_t v_value_6456_; 
lean_dec(v_h__3_6455_);
v_value_6456_ = lean_ctor_get_uint8(v_v_6452_, 0);
lean_dec_ref_known(v_v_6452_, 0);
if (v_value_6456_ == 0)
{
lean_object* v___x_6457_; lean_object* v___x_6458_; 
lean_dec(v_h__1_6453_);
v___x_6457_ = lean_box(0);
v___x_6458_ = lean_apply_1(v_h__2_6454_, v___x_6457_);
return v___x_6458_;
}
else
{
lean_object* v___x_6459_; lean_object* v___x_6460_; 
lean_dec(v_h__2_6454_);
v___x_6459_ = lean_box(0);
v___x_6460_ = lean_apply_1(v_h__1_6453_, v___x_6459_);
return v___x_6460_;
}
}
else
{
lean_object* v___x_6461_; 
lean_dec(v_h__2_6454_);
lean_dec(v_h__1_6453_);
v___x_6461_ = lean_apply_3(v_h__3_6455_, v_v_6452_, lean_box(0), lean_box(0));
return v___x_6461_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_eval(lean_object* v_env_6462_, lean_object* v_program_6463_){
_start:
{
lean_object* v___x_6464_; lean_object* v___x_6465_; lean_object* v___x_6466_; 
v___x_6464_ = lean_box(0);
v___x_6465_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_6465_, 0, v_program_6463_);
v___x_6466_ = lp_algalVerification_Algal_Expr_machine(v_env_6462_, v___x_6464_, v___x_6465_);
return v___x_6466_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_eval___boxed(lean_object* v_env_6467_, lean_object* v_program_6468_){
_start:
{
lean_object* v_res_6469_; 
v_res_6469_ = lp_algalVerification_Algal_Expr_eval(v_env_6467_, v_program_6468_);
lean_dec(v_env_6467_);
return v_res_6469_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_instDecidableEqFuelFailure_decEq(lean_object* v_x_6470_, lean_object* v_x_6471_){
_start:
{
lean_object* v_cost_6472_; lean_object* v_left_6473_; lean_object* v_cost_6474_; lean_object* v_left_6475_; uint8_t v___x_6476_; 
v_cost_6472_ = lean_ctor_get(v_x_6470_, 0);
v_left_6473_ = lean_ctor_get(v_x_6470_, 1);
v_cost_6474_ = lean_ctor_get(v_x_6471_, 0);
v_left_6475_ = lean_ctor_get(v_x_6471_, 1);
v___x_6476_ = lean_nat_dec_eq(v_cost_6472_, v_cost_6474_);
if (v___x_6476_ == 0)
{
return v___x_6476_;
}
else
{
uint8_t v___x_6477_; 
v___x_6477_ = lean_nat_dec_eq(v_left_6473_, v_left_6475_);
return v___x_6477_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instDecidableEqFuelFailure_decEq___boxed(lean_object* v_x_6478_, lean_object* v_x_6479_){
_start:
{
uint8_t v_res_6480_; lean_object* v_r_6481_; 
v_res_6480_ = lp_algalVerification_Algal_Expr_instDecidableEqFuelFailure_decEq(v_x_6478_, v_x_6479_);
lean_dec_ref(v_x_6479_);
lean_dec_ref(v_x_6478_);
v_r_6481_ = lean_box(v_res_6480_);
return v_r_6481_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_instDecidableEqFuelFailure(lean_object* v_x_6482_, lean_object* v_x_6483_){
_start:
{
uint8_t v___x_6484_; 
v___x_6484_ = lp_algalVerification_Algal_Expr_instDecidableEqFuelFailure_decEq(v_x_6482_, v_x_6483_);
return v___x_6484_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instDecidableEqFuelFailure___boxed(lean_object* v_x_6485_, lean_object* v_x_6486_){
_start:
{
uint8_t v_res_6487_; lean_object* v_r_6488_; 
v_res_6487_ = lp_algalVerification_Algal_Expr_instDecidableEqFuelFailure(v_x_6485_, v_x_6486_);
lean_dec_ref(v_x_6486_);
lean_dec_ref(v_x_6485_);
v_r_6488_ = lean_box(v_res_6487_);
return v_r_6488_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_replay(lean_object* v_x_6489_, lean_object* v_x_6490_){
_start:
{
if (lean_obj_tag(v_x_6490_) == 0)
{
lean_object* v___x_6491_; 
v___x_6491_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_6491_, 0, v_x_6489_);
return v___x_6491_;
}
else
{
lean_object* v_head_6492_; lean_object* v_tail_6493_; lean_object* v___x_6495_; uint8_t v_isShared_6496_; uint8_t v_isSharedCheck_6504_; 
v_head_6492_ = lean_ctor_get(v_x_6490_, 0);
v_tail_6493_ = lean_ctor_get(v_x_6490_, 1);
v_isSharedCheck_6504_ = !lean_is_exclusive(v_x_6490_);
if (v_isSharedCheck_6504_ == 0)
{
v___x_6495_ = v_x_6490_;
v_isShared_6496_ = v_isSharedCheck_6504_;
goto v_resetjp_6494_;
}
else
{
lean_inc(v_tail_6493_);
lean_inc(v_head_6492_);
lean_dec(v_x_6490_);
v___x_6495_ = lean_box(0);
v_isShared_6496_ = v_isSharedCheck_6504_;
goto v_resetjp_6494_;
}
v_resetjp_6494_:
{
uint8_t v___x_6497_; 
v___x_6497_ = lean_nat_dec_le(v_head_6492_, v_x_6489_);
if (v___x_6497_ == 0)
{
lean_object* v___x_6499_; 
lean_dec(v_tail_6493_);
if (v_isShared_6496_ == 0)
{
lean_ctor_set_tag(v___x_6495_, 0);
lean_ctor_set(v___x_6495_, 1, v_x_6489_);
v___x_6499_ = v___x_6495_;
goto v_reusejp_6498_;
}
else
{
lean_object* v_reuseFailAlloc_6501_; 
v_reuseFailAlloc_6501_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_6501_, 0, v_head_6492_);
lean_ctor_set(v_reuseFailAlloc_6501_, 1, v_x_6489_);
v___x_6499_ = v_reuseFailAlloc_6501_;
goto v_reusejp_6498_;
}
v_reusejp_6498_:
{
lean_object* v___x_6500_; 
v___x_6500_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_6500_, 0, v___x_6499_);
return v___x_6500_;
}
}
else
{
lean_object* v___x_6502_; 
lean_del_object(v___x_6495_);
v___x_6502_ = lean_nat_sub(v_x_6489_, v_head_6492_);
lean_dec(v_head_6492_);
lean_dec(v_x_6489_);
v_x_6489_ = v___x_6502_;
v_x_6490_ = v_tail_6493_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fuelErr(lean_object* v_f_6507_){
_start:
{
lean_object* v_cost_6508_; lean_object* v_left_6509_; lean_object* v___x_6511_; uint8_t v_isShared_6512_; uint8_t v_isSharedCheck_6526_; 
v_cost_6508_ = lean_ctor_get(v_f_6507_, 0);
v_left_6509_ = lean_ctor_get(v_f_6507_, 1);
v_isSharedCheck_6526_ = !lean_is_exclusive(v_f_6507_);
if (v_isSharedCheck_6526_ == 0)
{
v___x_6511_ = v_f_6507_;
v_isShared_6512_ = v_isSharedCheck_6526_;
goto v_resetjp_6510_;
}
else
{
lean_inc(v_left_6509_);
lean_inc(v_cost_6508_);
lean_dec(v_f_6507_);
v___x_6511_ = lean_box(0);
v_isShared_6512_ = v_isSharedCheck_6526_;
goto v_resetjp_6510_;
}
v_resetjp_6510_:
{
uint8_t v___x_6513_; lean_object* v___x_6514_; lean_object* v___x_6515_; lean_object* v___x_6517_; 
v___x_6513_ = 9;
v___x_6514_ = ((lean_object*)(lp_algalVerification_Algal_Expr_fuelErr___closed__0));
v___x_6515_ = lp_algalVerification_Algal_Expr_numVal(v_cost_6508_);
if (v_isShared_6512_ == 0)
{
lean_ctor_set(v___x_6511_, 1, v___x_6515_);
lean_ctor_set(v___x_6511_, 0, v___x_6514_);
v___x_6517_ = v___x_6511_;
goto v_reusejp_6516_;
}
else
{
lean_object* v_reuseFailAlloc_6525_; 
v_reuseFailAlloc_6525_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_6525_, 0, v___x_6514_);
lean_ctor_set(v_reuseFailAlloc_6525_, 1, v___x_6515_);
v___x_6517_ = v_reuseFailAlloc_6525_;
goto v_reusejp_6516_;
}
v_reusejp_6516_:
{
lean_object* v___x_6518_; lean_object* v___x_6519_; lean_object* v___x_6520_; lean_object* v___x_6521_; lean_object* v___x_6522_; lean_object* v___x_6523_; lean_object* v___x_6524_; 
v___x_6518_ = ((lean_object*)(lp_algalVerification_Algal_Expr_fuelErr___closed__1));
v___x_6519_ = lp_algalVerification_Algal_Expr_numVal(v_left_6509_);
v___x_6520_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_6520_, 0, v___x_6518_);
lean_ctor_set(v___x_6520_, 1, v___x_6519_);
v___x_6521_ = lean_box(0);
v___x_6522_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_6522_, 0, v___x_6520_);
lean_ctor_set(v___x_6522_, 1, v___x_6521_);
v___x_6523_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_6523_, 0, v___x_6517_);
lean_ctor_set(v___x_6523_, 1, v___x_6522_);
v___x_6524_ = lean_alloc_ctor(0, 1, 1);
lean_ctor_set(v___x_6524_, 0, v___x_6523_);
lean_ctor_set_uint8(v___x_6524_, sizeof(void*)*1, v___x_6513_);
return v___x_6524_;
}
}
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_evalFuelled___closed__1(void){
_start:
{
lean_object* v___x_6528_; lean_object* v___x_6529_; lean_object* v___x_6530_; 
v___x_6528_ = lean_unsigned_to_nat(32u);
v___x_6529_ = ((lean_object*)(lp_algalVerification_Algal_Expr_evalFuelled___closed__0));
v___x_6530_ = lp_algalVerification_Algal_Expr_errBounds(v___x_6529_, v___x_6528_);
return v___x_6530_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_evalFuelled___closed__3(void){
_start:
{
lean_object* v___x_6532_; lean_object* v___x_6533_; lean_object* v___x_6534_; 
v___x_6532_ = lean_unsigned_to_nat(65536u);
v___x_6533_ = ((lean_object*)(lp_algalVerification_Algal_Expr_evalFuelled___closed__2));
v___x_6534_ = lp_algalVerification_Algal_Expr_errBounds(v___x_6533_, v___x_6532_);
return v___x_6534_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_evalFuelled___closed__5(void){
_start:
{
lean_object* v___x_6536_; lean_object* v___x_6537_; lean_object* v___x_6538_; 
v___x_6536_ = lean_unsigned_to_nat(1000000u);
v___x_6537_ = ((lean_object*)(lp_algalVerification_Algal_Expr_evalFuelled___closed__4));
v___x_6538_ = lp_algalVerification_Algal_Expr_errBounds(v___x_6537_, v___x_6536_);
return v___x_6538_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_evalFuelled___closed__6(void){
_start:
{
lean_object* v___x_6539_; lean_object* v___x_6540_; lean_object* v___x_6541_; 
v___x_6539_ = lean_unsigned_to_nat(0u);
v___x_6540_ = lean_obj_once(&lp_algalVerification_Algal_Expr_evalFuelled___closed__5, &lp_algalVerification_Algal_Expr_evalFuelled___closed__5_once, _init_lp_algalVerification_Algal_Expr_evalFuelled___closed__5);
v___x_6541_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_6541_, 0, v___x_6540_);
lean_ctor_set(v___x_6541_, 1, v___x_6539_);
return v___x_6541_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_evalFuelled___closed__7(void){
_start:
{
lean_object* v___x_6542_; lean_object* v___x_6543_; 
v___x_6542_ = lean_obj_once(&lp_algalVerification_Algal_Expr_evalFuelled___closed__6, &lp_algalVerification_Algal_Expr_evalFuelled___closed__6_once, _init_lp_algalVerification_Algal_Expr_evalFuelled___closed__6);
v___x_6543_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_6543_, 0, v___x_6542_);
return v___x_6543_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_evalFuelled(lean_object* v_env_6544_, lean_object* v_program_6545_, lean_object* v_budget_6546_){
_start:
{
lean_object* v___x_6547_; uint8_t v___x_6548_; 
v___x_6547_ = lean_unsigned_to_nat(1000000u);
v___x_6548_ = lean_nat_dec_lt(v___x_6547_, v_budget_6546_);
if (v___x_6548_ == 0)
{
lean_object* v_o_6549_; lean_object* v_result_6550_; lean_object* v_charges_6551_; lean_object* v___x_6553_; uint8_t v_isShared_6554_; uint8_t v_isSharedCheck_6616_; 
v_o_6549_ = lp_algalVerification_Algal_Expr_eval(v_env_6544_, v_program_6545_);
v_result_6550_ = lean_ctor_get(v_o_6549_, 0);
v_charges_6551_ = lean_ctor_get(v_o_6549_, 1);
v_isSharedCheck_6616_ = !lean_is_exclusive(v_o_6549_);
if (v_isSharedCheck_6616_ == 0)
{
v___x_6553_ = v_o_6549_;
v_isShared_6554_ = v_isSharedCheck_6616_;
goto v_resetjp_6552_;
}
else
{
lean_inc(v_charges_6551_);
lean_inc(v_result_6550_);
lean_dec(v_o_6549_);
v___x_6553_ = lean_box(0);
v_isShared_6554_ = v_isSharedCheck_6616_;
goto v_resetjp_6552_;
}
v_resetjp_6552_:
{
lean_object* v___x_6555_; 
lean_inc(v_budget_6546_);
v___x_6555_ = lp_algalVerification_Algal_Expr_replay(v_budget_6546_, v_charges_6551_);
if (lean_obj_tag(v___x_6555_) == 0)
{
lean_object* v_a_6556_; lean_object* v___x_6558_; uint8_t v_isShared_6559_; uint8_t v_isSharedCheck_6569_; 
lean_dec_ref(v_result_6550_);
v_a_6556_ = lean_ctor_get(v___x_6555_, 0);
v_isSharedCheck_6569_ = !lean_is_exclusive(v___x_6555_);
if (v_isSharedCheck_6569_ == 0)
{
v___x_6558_ = v___x_6555_;
v_isShared_6559_ = v_isSharedCheck_6569_;
goto v_resetjp_6557_;
}
else
{
lean_inc(v_a_6556_);
lean_dec(v___x_6555_);
v___x_6558_ = lean_box(0);
v_isShared_6559_ = v_isSharedCheck_6569_;
goto v_resetjp_6557_;
}
v_resetjp_6557_:
{
lean_object* v_left_6560_; lean_object* v___x_6561_; lean_object* v___x_6562_; lean_object* v___x_6564_; 
v_left_6560_ = lean_ctor_get(v_a_6556_, 1);
lean_inc(v_left_6560_);
v___x_6561_ = lp_algalVerification_Algal_Expr_fuelErr(v_a_6556_);
v___x_6562_ = lean_nat_sub(v_budget_6546_, v_left_6560_);
lean_dec(v_left_6560_);
lean_dec(v_budget_6546_);
if (v_isShared_6554_ == 0)
{
lean_ctor_set(v___x_6553_, 1, v___x_6562_);
lean_ctor_set(v___x_6553_, 0, v___x_6561_);
v___x_6564_ = v___x_6553_;
goto v_reusejp_6563_;
}
else
{
lean_object* v_reuseFailAlloc_6568_; 
v_reuseFailAlloc_6568_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_6568_, 0, v___x_6561_);
lean_ctor_set(v_reuseFailAlloc_6568_, 1, v___x_6562_);
v___x_6564_ = v_reuseFailAlloc_6568_;
goto v_reusejp_6563_;
}
v_reusejp_6563_:
{
lean_object* v___x_6566_; 
if (v_isShared_6559_ == 0)
{
lean_ctor_set(v___x_6558_, 0, v___x_6564_);
v___x_6566_ = v___x_6558_;
goto v_reusejp_6565_;
}
else
{
lean_object* v_reuseFailAlloc_6567_; 
v_reuseFailAlloc_6567_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_6567_, 0, v___x_6564_);
v___x_6566_ = v_reuseFailAlloc_6567_;
goto v_reusejp_6565_;
}
v_reusejp_6565_:
{
return v___x_6566_;
}
}
}
}
else
{
if (lean_obj_tag(v_result_6550_) == 0)
{
lean_object* v_a_6570_; lean_object* v_a_6571_; lean_object* v___x_6573_; uint8_t v_isShared_6574_; uint8_t v_isSharedCheck_6582_; 
v_a_6570_ = lean_ctor_get(v___x_6555_, 0);
lean_inc(v_a_6570_);
lean_dec_ref_known(v___x_6555_, 1);
v_a_6571_ = lean_ctor_get(v_result_6550_, 0);
v_isSharedCheck_6582_ = !lean_is_exclusive(v_result_6550_);
if (v_isSharedCheck_6582_ == 0)
{
v___x_6573_ = v_result_6550_;
v_isShared_6574_ = v_isSharedCheck_6582_;
goto v_resetjp_6572_;
}
else
{
lean_inc(v_a_6571_);
lean_dec(v_result_6550_);
v___x_6573_ = lean_box(0);
v_isShared_6574_ = v_isSharedCheck_6582_;
goto v_resetjp_6572_;
}
v_resetjp_6572_:
{
lean_object* v___x_6575_; lean_object* v___x_6577_; 
v___x_6575_ = lean_nat_sub(v_budget_6546_, v_a_6570_);
lean_dec(v_a_6570_);
lean_dec(v_budget_6546_);
if (v_isShared_6554_ == 0)
{
lean_ctor_set(v___x_6553_, 1, v___x_6575_);
lean_ctor_set(v___x_6553_, 0, v_a_6571_);
v___x_6577_ = v___x_6553_;
goto v_reusejp_6576_;
}
else
{
lean_object* v_reuseFailAlloc_6581_; 
v_reuseFailAlloc_6581_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_6581_, 0, v_a_6571_);
lean_ctor_set(v_reuseFailAlloc_6581_, 1, v___x_6575_);
v___x_6577_ = v_reuseFailAlloc_6581_;
goto v_reusejp_6576_;
}
v_reusejp_6576_:
{
lean_object* v___x_6579_; 
if (v_isShared_6574_ == 0)
{
lean_ctor_set(v___x_6573_, 0, v___x_6577_);
v___x_6579_ = v___x_6573_;
goto v_reusejp_6578_;
}
else
{
lean_object* v_reuseFailAlloc_6580_; 
v_reuseFailAlloc_6580_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_6580_, 0, v___x_6577_);
v___x_6579_ = v_reuseFailAlloc_6580_;
goto v_reusejp_6578_;
}
v_reusejp_6578_:
{
return v___x_6579_;
}
}
}
}
else
{
lean_object* v_a_6583_; lean_object* v_a_6584_; lean_object* v___x_6586_; uint8_t v_isShared_6587_; uint8_t v_isSharedCheck_6615_; 
v_a_6583_ = lean_ctor_get(v___x_6555_, 0);
lean_inc(v_a_6583_);
lean_dec_ref_known(v___x_6555_, 1);
v_a_6584_ = lean_ctor_get(v_result_6550_, 0);
v_isSharedCheck_6615_ = !lean_is_exclusive(v_result_6550_);
if (v_isSharedCheck_6615_ == 0)
{
v___x_6586_ = v_result_6550_;
v_isShared_6587_ = v_isSharedCheck_6615_;
goto v_resetjp_6585_;
}
else
{
lean_inc(v_a_6584_);
lean_dec(v_result_6550_);
v___x_6586_ = lean_box(0);
v_isShared_6587_ = v_isSharedCheck_6615_;
goto v_resetjp_6585_;
}
v_resetjp_6585_:
{
lean_object* v_used___6588_; lean_object* v___x_6589_; lean_object* v___x_6590_; uint8_t v___x_6591_; 
v_used___6588_ = lean_nat_sub(v_budget_6546_, v_a_6583_);
lean_dec(v_a_6583_);
lean_dec(v_budget_6546_);
v___x_6589_ = lean_unsigned_to_nat(65536u);
lean_inc(v_a_6584_);
v___x_6590_ = lp_algalVerification_Algal_Expr_valueByteCount(v_a_6584_);
v___x_6591_ = lean_nat_dec_lt(v___x_6589_, v___x_6590_);
lean_dec(v___x_6590_);
if (v___x_6591_ == 0)
{
lean_object* v___x_6592_; lean_object* v___x_6593_; uint8_t v___x_6594_; 
v___x_6592_ = lean_unsigned_to_nat(32u);
v___x_6593_ = lp_algalVerification_Algal_Expr_valueDepth(v_a_6584_);
v___x_6594_ = lean_nat_dec_lt(v___x_6592_, v___x_6593_);
lean_dec(v___x_6593_);
if (v___x_6594_ == 0)
{
lean_object* v___x_6596_; 
if (v_isShared_6554_ == 0)
{
lean_ctor_set(v___x_6553_, 1, v_used___6588_);
lean_ctor_set(v___x_6553_, 0, v_a_6584_);
v___x_6596_ = v___x_6553_;
goto v_reusejp_6595_;
}
else
{
lean_object* v_reuseFailAlloc_6600_; 
v_reuseFailAlloc_6600_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_6600_, 0, v_a_6584_);
lean_ctor_set(v_reuseFailAlloc_6600_, 1, v_used___6588_);
v___x_6596_ = v_reuseFailAlloc_6600_;
goto v_reusejp_6595_;
}
v_reusejp_6595_:
{
lean_object* v___x_6598_; 
if (v_isShared_6587_ == 0)
{
lean_ctor_set(v___x_6586_, 0, v___x_6596_);
v___x_6598_ = v___x_6586_;
goto v_reusejp_6597_;
}
else
{
lean_object* v_reuseFailAlloc_6599_; 
v_reuseFailAlloc_6599_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_6599_, 0, v___x_6596_);
v___x_6598_ = v_reuseFailAlloc_6599_;
goto v_reusejp_6597_;
}
v_reusejp_6597_:
{
return v___x_6598_;
}
}
}
else
{
lean_object* v___x_6601_; lean_object* v___x_6603_; 
lean_dec(v_a_6584_);
v___x_6601_ = lean_obj_once(&lp_algalVerification_Algal_Expr_evalFuelled___closed__1, &lp_algalVerification_Algal_Expr_evalFuelled___closed__1_once, _init_lp_algalVerification_Algal_Expr_evalFuelled___closed__1);
if (v_isShared_6554_ == 0)
{
lean_ctor_set(v___x_6553_, 1, v_used___6588_);
lean_ctor_set(v___x_6553_, 0, v___x_6601_);
v___x_6603_ = v___x_6553_;
goto v_reusejp_6602_;
}
else
{
lean_object* v_reuseFailAlloc_6607_; 
v_reuseFailAlloc_6607_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_6607_, 0, v___x_6601_);
lean_ctor_set(v_reuseFailAlloc_6607_, 1, v_used___6588_);
v___x_6603_ = v_reuseFailAlloc_6607_;
goto v_reusejp_6602_;
}
v_reusejp_6602_:
{
lean_object* v___x_6605_; 
if (v_isShared_6587_ == 0)
{
lean_ctor_set_tag(v___x_6586_, 0);
lean_ctor_set(v___x_6586_, 0, v___x_6603_);
v___x_6605_ = v___x_6586_;
goto v_reusejp_6604_;
}
else
{
lean_object* v_reuseFailAlloc_6606_; 
v_reuseFailAlloc_6606_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_6606_, 0, v___x_6603_);
v___x_6605_ = v_reuseFailAlloc_6606_;
goto v_reusejp_6604_;
}
v_reusejp_6604_:
{
return v___x_6605_;
}
}
}
}
else
{
lean_object* v___x_6608_; lean_object* v___x_6610_; 
lean_dec(v_a_6584_);
v___x_6608_ = lean_obj_once(&lp_algalVerification_Algal_Expr_evalFuelled___closed__3, &lp_algalVerification_Algal_Expr_evalFuelled___closed__3_once, _init_lp_algalVerification_Algal_Expr_evalFuelled___closed__3);
if (v_isShared_6554_ == 0)
{
lean_ctor_set(v___x_6553_, 1, v_used___6588_);
lean_ctor_set(v___x_6553_, 0, v___x_6608_);
v___x_6610_ = v___x_6553_;
goto v_reusejp_6609_;
}
else
{
lean_object* v_reuseFailAlloc_6614_; 
v_reuseFailAlloc_6614_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_6614_, 0, v___x_6608_);
lean_ctor_set(v_reuseFailAlloc_6614_, 1, v_used___6588_);
v___x_6610_ = v_reuseFailAlloc_6614_;
goto v_reusejp_6609_;
}
v_reusejp_6609_:
{
lean_object* v___x_6612_; 
if (v_isShared_6587_ == 0)
{
lean_ctor_set_tag(v___x_6586_, 0);
lean_ctor_set(v___x_6586_, 0, v___x_6610_);
v___x_6612_ = v___x_6586_;
goto v_reusejp_6611_;
}
else
{
lean_object* v_reuseFailAlloc_6613_; 
v_reuseFailAlloc_6613_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_6613_, 0, v___x_6610_);
v___x_6612_ = v_reuseFailAlloc_6613_;
goto v_reusejp_6611_;
}
v_reusejp_6611_:
{
return v___x_6612_;
}
}
}
}
}
}
}
}
else
{
lean_object* v___x_6617_; 
lean_dec(v_budget_6546_);
lean_dec(v_program_6545_);
v___x_6617_ = lean_obj_once(&lp_algalVerification_Algal_Expr_evalFuelled___closed__7, &lp_algalVerification_Algal_Expr_evalFuelled___closed__7_once, _init_lp_algalVerification_Algal_Expr_evalFuelled___closed__7);
return v___x_6617_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_evalFuelled___boxed(lean_object* v_env_6618_, lean_object* v_program_6619_, lean_object* v_budget_6620_){
_start:
{
lean_object* v_res_6621_; 
v_res_6621_ = lp_algalVerification_Algal_Expr_evalFuelled(v_env_6618_, v_program_6619_, v_budget_6620_);
lean_dec(v_env_6618_);
return v_res_6621_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_checkEnvValues(lean_object* v_x_6622_){
_start:
{
if (lean_obj_tag(v_x_6622_) == 0)
{
lean_object* v___x_6623_; 
v___x_6623_ = ((lean_object*)(lp_algalVerification_Algal_Expr_charge___closed__0));
return v___x_6623_;
}
else
{
lean_object* v_head_6624_; lean_object* v_tail_6625_; lean_object* v_snd_6626_; lean_object* v___x_6627_; lean_object* v___x_6628_; 
v_head_6624_ = lean_ctor_get(v_x_6622_, 0);
lean_inc(v_head_6624_);
v_tail_6625_ = lean_ctor_get(v_x_6622_, 1);
lean_inc(v_tail_6625_);
lean_dec_ref_known(v_x_6622_, 2);
v_snd_6626_ = lean_ctor_get(v_head_6624_, 1);
lean_inc(v_snd_6626_);
lean_dec(v_head_6624_);
v___x_6627_ = lean_unsigned_to_nat(1u);
v___x_6628_ = lp_algalVerification_Algal_Expr_valueBytes(v_snd_6626_, v___x_6627_);
if (lean_obj_tag(v___x_6628_) == 0)
{
lean_object* v_a_6629_; lean_object* v___x_6631_; uint8_t v_isShared_6632_; uint8_t v_isSharedCheck_6636_; 
lean_dec(v_tail_6625_);
v_a_6629_ = lean_ctor_get(v___x_6628_, 0);
v_isSharedCheck_6636_ = !lean_is_exclusive(v___x_6628_);
if (v_isSharedCheck_6636_ == 0)
{
v___x_6631_ = v___x_6628_;
v_isShared_6632_ = v_isSharedCheck_6636_;
goto v_resetjp_6630_;
}
else
{
lean_inc(v_a_6629_);
lean_dec(v___x_6628_);
v___x_6631_ = lean_box(0);
v_isShared_6632_ = v_isSharedCheck_6636_;
goto v_resetjp_6630_;
}
v_resetjp_6630_:
{
lean_object* v___x_6634_; 
if (v_isShared_6632_ == 0)
{
v___x_6634_ = v___x_6631_;
goto v_reusejp_6633_;
}
else
{
lean_object* v_reuseFailAlloc_6635_; 
v_reuseFailAlloc_6635_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_6635_, 0, v_a_6629_);
v___x_6634_ = v_reuseFailAlloc_6635_;
goto v_reusejp_6633_;
}
v_reusejp_6633_:
{
return v___x_6634_;
}
}
}
else
{
lean_dec_ref_known(v___x_6628_, 1);
v_x_6622_ = v_tail_6625_;
goto _start;
}
}
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_run___closed__1(void){
_start:
{
lean_object* v___x_6639_; lean_object* v___x_6640_; lean_object* v___x_6641_; 
v___x_6639_ = lean_unsigned_to_nat(16u);
v___x_6640_ = ((lean_object*)(lp_algalVerification_Algal_Expr_run___closed__0));
v___x_6641_ = lp_algalVerification_Algal_Expr_errBounds(v___x_6640_, v___x_6639_);
return v___x_6641_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_run___closed__2(void){
_start:
{
lean_object* v___x_6642_; lean_object* v___x_6643_; lean_object* v___x_6644_; 
v___x_6642_ = lean_unsigned_to_nat(0u);
v___x_6643_ = lean_obj_once(&lp_algalVerification_Algal_Expr_run___closed__1, &lp_algalVerification_Algal_Expr_run___closed__1_once, _init_lp_algalVerification_Algal_Expr_run___closed__1);
v___x_6644_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_6644_, 0, v___x_6643_);
lean_ctor_set(v___x_6644_, 1, v___x_6642_);
return v___x_6644_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_run___closed__3(void){
_start:
{
lean_object* v___x_6645_; lean_object* v___x_6646_; 
v___x_6645_ = lean_obj_once(&lp_algalVerification_Algal_Expr_run___closed__2, &lp_algalVerification_Algal_Expr_run___closed__2_once, _init_lp_algalVerification_Algal_Expr_run___closed__2);
v___x_6646_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_6646_, 0, v___x_6645_);
return v___x_6646_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_run___closed__5(void){
_start:
{
lean_object* v___x_6648_; lean_object* v___x_6649_; lean_object* v___x_6650_; 
v___x_6648_ = lean_unsigned_to_nat(512u);
v___x_6649_ = ((lean_object*)(lp_algalVerification_Algal_Expr_run___closed__4));
v___x_6650_ = lp_algalVerification_Algal_Expr_errBounds(v___x_6649_, v___x_6648_);
return v___x_6650_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_run___closed__6(void){
_start:
{
lean_object* v___x_6651_; lean_object* v___x_6652_; lean_object* v___x_6653_; 
v___x_6651_ = lean_unsigned_to_nat(0u);
v___x_6652_ = lean_obj_once(&lp_algalVerification_Algal_Expr_run___closed__5, &lp_algalVerification_Algal_Expr_run___closed__5_once, _init_lp_algalVerification_Algal_Expr_run___closed__5);
v___x_6653_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_6653_, 0, v___x_6652_);
lean_ctor_set(v___x_6653_, 1, v___x_6651_);
return v___x_6653_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_run___closed__7(void){
_start:
{
lean_object* v___x_6654_; lean_object* v___x_6655_; 
v___x_6654_ = lean_obj_once(&lp_algalVerification_Algal_Expr_run___closed__6, &lp_algalVerification_Algal_Expr_run___closed__6_once, _init_lp_algalVerification_Algal_Expr_run___closed__6);
v___x_6655_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_6655_, 0, v___x_6654_);
return v___x_6655_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_run___closed__9(void){
_start:
{
lean_object* v___x_6657_; lean_object* v___x_6658_; lean_object* v___x_6659_; 
v___x_6657_ = lean_unsigned_to_nat(16384u);
v___x_6658_ = ((lean_object*)(lp_algalVerification_Algal_Expr_run___closed__8));
v___x_6659_ = lp_algalVerification_Algal_Expr_errBounds(v___x_6658_, v___x_6657_);
return v___x_6659_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_run___closed__10(void){
_start:
{
lean_object* v___x_6660_; lean_object* v___x_6661_; lean_object* v___x_6662_; 
v___x_6660_ = lean_unsigned_to_nat(0u);
v___x_6661_ = lean_obj_once(&lp_algalVerification_Algal_Expr_run___closed__9, &lp_algalVerification_Algal_Expr_run___closed__9_once, _init_lp_algalVerification_Algal_Expr_run___closed__9);
v___x_6662_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_6662_, 0, v___x_6661_);
lean_ctor_set(v___x_6662_, 1, v___x_6660_);
return v___x_6662_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_run___closed__11(void){
_start:
{
lean_object* v___x_6663_; lean_object* v___x_6664_; 
v___x_6663_ = lean_obj_once(&lp_algalVerification_Algal_Expr_run___closed__10, &lp_algalVerification_Algal_Expr_run___closed__10_once, _init_lp_algalVerification_Algal_Expr_run___closed__10);
v___x_6664_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_6664_, 0, v___x_6663_);
return v___x_6664_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_run___closed__12(void){
_start:
{
lean_object* v___x_6665_; lean_object* v___x_6666_; lean_object* v___x_6667_; 
v___x_6665_ = lean_unsigned_to_nat(0u);
v___x_6666_ = lean_obj_once(&lp_algalVerification_Algal_Expr_evalFuelled___closed__1, &lp_algalVerification_Algal_Expr_evalFuelled___closed__1_once, _init_lp_algalVerification_Algal_Expr_evalFuelled___closed__1);
v___x_6667_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_6667_, 0, v___x_6666_);
lean_ctor_set(v___x_6667_, 1, v___x_6665_);
return v___x_6667_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_run___closed__13(void){
_start:
{
lean_object* v___x_6668_; lean_object* v___x_6669_; 
v___x_6668_ = lean_obj_once(&lp_algalVerification_Algal_Expr_run___closed__12, &lp_algalVerification_Algal_Expr_run___closed__12_once, _init_lp_algalVerification_Algal_Expr_run___closed__12);
v___x_6669_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_6669_, 0, v___x_6668_);
return v___x_6669_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_run___closed__15(void){
_start:
{
lean_object* v___x_6671_; lean_object* v___x_6672_; lean_object* v___x_6673_; 
v___x_6671_ = lean_unsigned_to_nat(262144u);
v___x_6672_ = ((lean_object*)(lp_algalVerification_Algal_Expr_run___closed__14));
v___x_6673_ = lp_algalVerification_Algal_Expr_errBounds(v___x_6672_, v___x_6671_);
return v___x_6673_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_run___closed__16(void){
_start:
{
lean_object* v___x_6674_; lean_object* v___x_6675_; lean_object* v___x_6676_; 
v___x_6674_ = lean_unsigned_to_nat(0u);
v___x_6675_ = lean_obj_once(&lp_algalVerification_Algal_Expr_run___closed__15, &lp_algalVerification_Algal_Expr_run___closed__15_once, _init_lp_algalVerification_Algal_Expr_run___closed__15);
v___x_6676_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_6676_, 0, v___x_6675_);
lean_ctor_set(v___x_6676_, 1, v___x_6674_);
return v___x_6676_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_run___closed__17(void){
_start:
{
lean_object* v___x_6677_; lean_object* v___x_6678_; 
v___x_6677_ = lean_obj_once(&lp_algalVerification_Algal_Expr_run___closed__16, &lp_algalVerification_Algal_Expr_run___closed__16_once, _init_lp_algalVerification_Algal_Expr_run___closed__16);
v___x_6678_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_6678_, 0, v___x_6677_);
return v___x_6678_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_run___closed__18(void){
_start:
{
lean_object* v___x_6679_; lean_object* v___x_6680_; lean_object* v___x_6681_; 
v___x_6679_ = lean_unsigned_to_nat(0u);
v___x_6680_ = lean_obj_once(&lp_algalVerification_Algal_Expr_mergeLoop___closed__1, &lp_algalVerification_Algal_Expr_mergeLoop___closed__1_once, _init_lp_algalVerification_Algal_Expr_mergeLoop___closed__1);
v___x_6681_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_6681_, 0, v___x_6680_);
lean_ctor_set(v___x_6681_, 1, v___x_6679_);
return v___x_6681_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_run___closed__19(void){
_start:
{
lean_object* v___x_6682_; lean_object* v___x_6683_; 
v___x_6682_ = lean_obj_once(&lp_algalVerification_Algal_Expr_run___closed__18, &lp_algalVerification_Algal_Expr_run___closed__18_once, _init_lp_algalVerification_Algal_Expr_run___closed__18);
v___x_6683_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_6683_, 0, v___x_6682_);
return v___x_6683_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_run(lean_object* v_program_6684_, lean_object* v_env_6685_, lean_object* v_budget_6686_){
_start:
{
lean_object* v___x_6687_; lean_object* v___x_6688_; uint8_t v___x_6689_; 
v___x_6687_ = lean_unsigned_to_nat(256u);
v___x_6688_ = l_List_lengthTR___redArg(v_env_6685_);
v___x_6689_ = lean_nat_dec_lt(v___x_6687_, v___x_6688_);
lean_dec(v___x_6688_);
if (v___x_6689_ == 0)
{
lean_object* v___x_6690_; lean_object* v___x_6691_; uint8_t v___x_6692_; 
v___x_6690_ = lean_unsigned_to_nat(262144u);
lean_inc(v_env_6685_);
v___x_6691_ = lp_algalVerification_Algal_Expr_envBytes(v_env_6685_);
v___x_6692_ = lean_nat_dec_lt(v___x_6690_, v___x_6691_);
lean_dec(v___x_6691_);
if (v___x_6692_ == 0)
{
lean_object* v___x_6693_; lean_object* v___x_6694_; uint8_t v___x_6695_; 
v___x_6693_ = lean_unsigned_to_nat(32u);
v___x_6694_ = lp_algalVerification_Algal_Expr_envDepth(v_env_6685_);
v___x_6695_ = lean_nat_dec_lt(v___x_6693_, v___x_6694_);
lean_dec(v___x_6694_);
if (v___x_6695_ == 0)
{
lean_object* v___x_6696_; 
lean_inc(v_env_6685_);
v___x_6696_ = lp_algalVerification_Algal_Expr_checkEnvValues(v_env_6685_);
if (lean_obj_tag(v___x_6696_) == 0)
{
lean_object* v_a_6697_; lean_object* v___x_6699_; uint8_t v_isShared_6700_; uint8_t v_isSharedCheck_6706_; 
lean_dec(v_budget_6686_);
lean_dec(v_env_6685_);
lean_dec(v_program_6684_);
v_a_6697_ = lean_ctor_get(v___x_6696_, 0);
v_isSharedCheck_6706_ = !lean_is_exclusive(v___x_6696_);
if (v_isSharedCheck_6706_ == 0)
{
v___x_6699_ = v___x_6696_;
v_isShared_6700_ = v_isSharedCheck_6706_;
goto v_resetjp_6698_;
}
else
{
lean_inc(v_a_6697_);
lean_dec(v___x_6696_);
v___x_6699_ = lean_box(0);
v_isShared_6700_ = v_isSharedCheck_6706_;
goto v_resetjp_6698_;
}
v_resetjp_6698_:
{
lean_object* v___x_6701_; lean_object* v___x_6702_; lean_object* v___x_6704_; 
v___x_6701_ = lean_unsigned_to_nat(0u);
v___x_6702_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_6702_, 0, v_a_6697_);
lean_ctor_set(v___x_6702_, 1, v___x_6701_);
if (v_isShared_6700_ == 0)
{
lean_ctor_set(v___x_6699_, 0, v___x_6702_);
v___x_6704_ = v___x_6699_;
goto v_reusejp_6703_;
}
else
{
lean_object* v_reuseFailAlloc_6705_; 
v_reuseFailAlloc_6705_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_6705_, 0, v___x_6702_);
v___x_6704_ = v_reuseFailAlloc_6705_;
goto v_reusejp_6703_;
}
v_reusejp_6703_:
{
return v___x_6704_;
}
}
}
else
{
lean_object* v___x_6707_; lean_object* v___x_6708_; uint8_t v___x_6709_; 
lean_dec_ref_known(v___x_6696_, 1);
v___x_6707_ = lean_unsigned_to_nat(16384u);
lean_inc(v_program_6684_);
v___x_6708_ = lp_algalVerification_Algal_Expr_valueByteCount(v_program_6684_);
v___x_6709_ = lean_nat_dec_lt(v___x_6707_, v___x_6708_);
lean_dec(v___x_6708_);
if (v___x_6709_ == 0)
{
lean_object* v___x_6710_; lean_object* v___x_6711_; uint8_t v___x_6712_; 
v___x_6710_ = lean_unsigned_to_nat(512u);
v___x_6711_ = lp_algalVerification_Algal_Expr_countNodes(v_program_6684_);
v___x_6712_ = lean_nat_dec_lt(v___x_6710_, v___x_6711_);
lean_dec(v___x_6711_);
if (v___x_6712_ == 0)
{
lean_object* v___x_6713_; lean_object* v___x_6714_; lean_object* v___x_6715_; lean_object* v___x_6716_; uint8_t v___x_6717_; 
v___x_6713_ = lean_unsigned_to_nat(16u);
v___x_6714_ = lp_algalVerification_Algal_Expr_valueDepth(v_program_6684_);
v___x_6715_ = lean_unsigned_to_nat(1u);
v___x_6716_ = lean_nat_add(v___x_6714_, v___x_6715_);
lean_dec(v___x_6714_);
v___x_6717_ = lean_nat_dec_lt(v___x_6713_, v___x_6716_);
lean_dec(v___x_6716_);
if (v___x_6717_ == 0)
{
lean_object* v___x_6718_; 
v___x_6718_ = lp_algalVerification_Algal_Expr_evalFuelled(v_env_6685_, v_program_6684_, v_budget_6686_);
lean_dec(v_env_6685_);
return v___x_6718_;
}
else
{
lean_object* v___x_6719_; 
lean_dec(v_budget_6686_);
lean_dec(v_env_6685_);
lean_dec(v_program_6684_);
v___x_6719_ = lean_obj_once(&lp_algalVerification_Algal_Expr_run___closed__3, &lp_algalVerification_Algal_Expr_run___closed__3_once, _init_lp_algalVerification_Algal_Expr_run___closed__3);
return v___x_6719_;
}
}
else
{
lean_object* v___x_6720_; 
lean_dec(v_budget_6686_);
lean_dec(v_env_6685_);
lean_dec(v_program_6684_);
v___x_6720_ = lean_obj_once(&lp_algalVerification_Algal_Expr_run___closed__7, &lp_algalVerification_Algal_Expr_run___closed__7_once, _init_lp_algalVerification_Algal_Expr_run___closed__7);
return v___x_6720_;
}
}
else
{
lean_object* v___x_6721_; 
lean_dec(v_budget_6686_);
lean_dec(v_env_6685_);
lean_dec(v_program_6684_);
v___x_6721_ = lean_obj_once(&lp_algalVerification_Algal_Expr_run___closed__11, &lp_algalVerification_Algal_Expr_run___closed__11_once, _init_lp_algalVerification_Algal_Expr_run___closed__11);
return v___x_6721_;
}
}
}
else
{
lean_object* v___x_6722_; 
lean_dec(v_budget_6686_);
lean_dec(v_env_6685_);
lean_dec(v_program_6684_);
v___x_6722_ = lean_obj_once(&lp_algalVerification_Algal_Expr_run___closed__13, &lp_algalVerification_Algal_Expr_run___closed__13_once, _init_lp_algalVerification_Algal_Expr_run___closed__13);
return v___x_6722_;
}
}
else
{
lean_object* v___x_6723_; 
lean_dec(v_budget_6686_);
lean_dec(v_env_6685_);
lean_dec(v_program_6684_);
v___x_6723_ = lean_obj_once(&lp_algalVerification_Algal_Expr_run___closed__17, &lp_algalVerification_Algal_Expr_run___closed__17_once, _init_lp_algalVerification_Algal_Expr_run___closed__17);
return v___x_6723_;
}
}
else
{
lean_object* v___x_6724_; 
lean_dec(v_budget_6686_);
lean_dec(v_env_6685_);
lean_dec(v_program_6684_);
v___x_6724_ = lean_obj_once(&lp_algalVerification_Algal_Expr_run___closed__19, &lp_algalVerification_Algal_Expr_run___closed__19_once, _init_lp_algalVerification_Algal_Expr_run___closed__19);
return v___x_6724_;
}
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Expr_Model(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Expr_Eval(uint8_t builtin) {
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
res = initialize_algalVerification_Algal_Expr_Model(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
